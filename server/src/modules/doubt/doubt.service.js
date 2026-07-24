const mongoose = require("mongoose");
const { AppError } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");
const { emitToUser, emitToSubject } = require("../../socket");
const notificationService = require("../notification/notification.service");

const Topic = require("../../models/Topic");
const Doubt = require("../../models/Doubt");
const DoubtResponse = require("../../models/DoubtResponse");
const EngagementEvent = require("../../models/EngagementEvent");
const TeacherSubject = require("../../models/TeacherSubject");

// ═══════════════════════════════════════════════════
// STUDENT: SUBMIT DOUBT
// ═══════════════════════════════════════════════════

async function submitDoubt(studentProfileId, data) {
  const { topicId, text } = data;

  const topic = await Topic.findById(topicId).populate('subjectId');
  if (!topic) throw new AppError("Topic not found.", 404);

  const doubt = await Doubt.create({
    studentId: studentProfileId,
    topicId,
    subjectId: topic.subjectId._id || topic.subjectId,
    text,
    status: "NEW",
  });

  const populatedDoubt = await Doubt.findById(doubt._id)
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'fullName' }
    })
    .populate('topicId', 'title')
    .populate('subjectId', 'name');

  // Record engagement event
  await EngagementEvent.create({
    studentId: studentProfileId,
    eventType: "DOUBT_SUBMITTED",
    contentAssetId: null, // Since this is for a doubt, no asset ID
    metadata: { doubtId: doubt._id.toString(), topicId, subjectId: topic.subjectId._id || topic.subjectId },
  });

  // Find the assigned teacher for this subject and notify via Socket
  const teacherAssignment = await TeacherSubject.findOne({ subjectId: topic.subjectId._id || topic.subjectId })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'id fullName' }
    });

  if (teacherAssignment && teacherAssignment.teacherId) {
    const teacherUserId = teacherAssignment.teacherId.userId._id;

    // Real-time Socket notification
    emitToUser(teacherUserId.toString(), "doubt:new", {
      doubtId: doubt._id,
      topic: topic.title,
      subject: topic.subjectId.name,
      studentName: populatedDoubt.studentId.userId.fullName,
      preview: text.slice(0, 100),
      createdAt: doubt.createdAt,
    });

    // Also broadcast to subject room for any listening teachers
    emitToSubject(topic.subjectId._id.toString(), "doubt:new", {
      doubtId: doubt._id,
      topic: topic.title,
      preview: text.slice(0, 100),
    });
  }

  logger.info("Doubt submitted", {
    doubtId: doubt._id,
    studentId: studentProfileId,
    topicId,
    subjectId: topic.subjectId._id || topic.subjectId,
  });

  return populatedDoubt;
}

// ═══════════════════════════════════════════════════
// STUDENT: MY DOUBTS
// ═══════════════════════════════════════════════════

async function getStudentDoubts(studentProfileId, { page = 1, limit = 50, skip = 0, status } = {}) {
  const query = { studentId: studentProfileId };
  if (status) query.status = status;

  const [doubts, total] = await Promise.all([
    Doubt.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('topicId', 'id title')
      .populate('subjectId', 'id name'),
    Doubt.countDocuments(query),
  ]);

  // For responses, we fetch them manually since we didn't embed responses directly inside Doubt model
  const doubtIds = doubts.map(d => d._id);
  const responses = await DoubtResponse.find({ doubtId: { $in: doubtIds } })
    .sort({ createdAt: 1 })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'fullName' }
    });

  const responseMap = {};
  doubtIds.forEach(id => { responseMap[id.toString()] = []; });
  responses.forEach(r => { responseMap[r.doubtId.toString()].push(r); });

  const enrichedDoubts = doubts.map(d => {
    const obj = d.toObject();
    obj.responses = responseMap[d._id.toString()];
    obj._count = { responses: obj.responses.length };
    return obj;
  });

  return { doubts: enrichedDoubts, total };
}

// ═══════════════════════════════════════════════════
// STUDENT: Q&A THREAD FOR A TOPIC
// ═══════════════════════════════════════════════════

async function getTopicQAThread(topicId, { page = 1, limit = 50, skip = 0 } = {}) {
  const query = {
    topicId,
    status: { $in: ["ANSWERED", "CLOSED"] },
  };

  const [doubts, total] = await Promise.all([
    Doubt.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'fullName' }
      }),
    Doubt.countDocuments(query),
  ]);

  const doubtIds = doubts.map(d => d._id);
  const responses = await DoubtResponse.find({ doubtId: { $in: doubtIds } })
    .sort({ createdAt: 1 })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'fullName' }
    });

  const responseMap = {};
  doubtIds.forEach(id => { responseMap[id.toString()] = []; });
  responses.forEach(r => { responseMap[r.doubtId.toString()].push(r); });

  const enrichedDoubts = doubts.map(d => {
    const obj = d.toObject();
    obj.responses = responseMap[d._id.toString()];
    return obj;
  });

  return { doubts: enrichedDoubts, total };
}

// ═══════════════════════════════════════════════════
// TEACHER: DOUBT QUEUE
// ═══════════════════════════════════════════════════

async function getTeacherDoubtQueue(teacherProfileId, { page = 1, limit = 50, skip = 0, status, subjectId, topicId } = {}) {
  const assignments = await TeacherSubject.find({ teacherId: teacherProfileId }).select('subjectId');
  const assignedSubjectIds = assignments.map((a) => a.subjectId);

  if (assignedSubjectIds.length === 0) {
    return { doubts: [], total: 0 };
  }

  const query = {
    subjectId: { $in: subjectId ? [subjectId] : assignedSubjectIds },
  };

  if (status) query.status = status;
  else query.status = { $in: ["NEW", "ESCALATED"] };

  if (topicId) query.topicId = topicId;

  const [doubts, total] = await Promise.all([
    Doubt.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ status: 1, createdAt: 1 }) // NEW first, then oldest first
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('topicId', 'id title')
      .populate('subjectId', 'id name'),
    Doubt.countDocuments(query),
  ]);

  const doubtIds = doubts.map(d => d._id);
  const responses = await DoubtResponse.find({ doubtId: { $in: doubtIds } })
    .sort({ createdAt: -1 })
    .select('doubtId createdAt');

  const responseMap = {};
  doubtIds.forEach(id => { responseMap[id.toString()] = []; });
  responses.forEach(r => { 
    if (responseMap[r.doubtId.toString()].length === 0) {
      responseMap[r.doubtId.toString()].push(r);
    }
  });

  const enrichedDoubts = doubts.map(d => {
    const ageMs = Date.now() - new Date(d.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    
    const obj = d.toObject();
    obj.responses = responseMap[d._id.toString()];
    obj._count = { responses: obj.responses.length };
    obj.ageHours = ageHours;
    obj.isAged = ageHours > 24;
    return obj;
  });

  return { doubts: enrichedDoubts, total };
}

// ═══════════════════════════════════════════════════
// TEACHER: RESPOND TO DOUBT
// ═══════════════════════════════════════════════════

async function respondToDoubt(teacherProfileId, doubtId, data) {
  const doubt = await Doubt.findById(doubtId)
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'id fullName' }
    })
    .populate('topicId', 'title')
    .populate('subjectId');

  if (!doubt) throw new AppError("Doubt not found.", 404);

  const assignment = await TeacherSubject.findOne({
    teacherId: teacherProfileId,
    subjectId: doubt.subjectId._id || doubt.subjectId,
  });

  if (!assignment) {
    throw new AppError("You are not assigned to this subject.", 403);
  }

  const response = await DoubtResponse.create({
    doubtId,
    teacherId: teacherProfileId,
    text: data.text || null,
    clipUrl: data.clipUrl || null,
  });

  const populatedResponse = await DoubtResponse.findById(response._id).populate({
    path: 'teacherId',
    populate: { path: 'userId', select: 'fullName' }
  });

  const updateData = { status: "ANSWERED" };
  if (!doubt.firstResponseAt) {
    updateData.firstResponseAt = new Date();
  }

  await Doubt.findByIdAndUpdate(doubtId, updateData);

  const studentUserId = doubt.studentId.userId._id;
  emitToUser(studentUserId.toString(), "doubt:responded", {
    doubtId,
    teacherName: populatedResponse.teacherId.userId.fullName,
    preview: (data.text || "Video response").slice(0, 100),
    topicTitle: doubt.topicId.title,
  });

  await notificationService.templates.doubtResponse(
    studentUserId.toString(),
    doubtId,
    populatedResponse.teacherId.userId.fullName,
    doubt.topicId.title
  );

  logger.info("Doubt response added", {
    doubtId,
    responseId: response._id,
    teacherId: teacherProfileId,
  });

  return populatedResponse;
}

// ═══════════════════════════════════════════════════
// TEACHER: UPDATE DOUBT STATUS
// ═══════════════════════════════════════════════════

async function updateDoubtStatus(teacherProfileId, doubtId, newStatus) {
  const doubt = await Doubt.findById(doubtId)
    .populate({ path: 'studentId', populate: { path: 'userId', select: 'id' } });

  if (!doubt) throw new AppError("Doubt not found.", 404);

  const assignment = await TeacherSubject.findOne({
    teacherId: teacherProfileId,
    subjectId: doubt.subjectId,
  });

  if (!assignment) {
    throw new AppError("You are not assigned to this subject.", 403);
  }

  const updateData = { status: newStatus };
  if (newStatus === "CLOSED") {
    updateData.closedAt = new Date();
  }

  const updated = await Doubt.findByIdAndUpdate(doubtId, updateData, { new: true });

  emitToUser(doubt.studentId.userId._id.toString(), "doubt:statusChange", {
    doubtId,
    newStatus,
  });

  return updated;
}

// ═══════════════════════════════════════════════════
// ADMIN: UNRESOLVED DOUBTS OVERSIGHT
// ═══════════════════════════════════════════════════

async function getUnresolvedDoubts({ page = 1, limit = 50, skip = 0, agedOnly = false } = {}) {
  const query = {
    status: { $in: ["NEW", "ESCALATED"] },
  };

  if (agedOnly) {
    query.createdAt = {
      $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // > 24 hours old
    };
  }

  const [doubts, total] = await Promise.all([
    Doubt.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'fullName' }
      })
      .populate('topicId', 'title')
      .populate({
        path: 'subjectId',
        select: 'name',
        populate: {
          path: 'teacherSubjects',
          populate: {
            path: 'teacherId',
            populate: { path: 'userId', select: 'fullName' }
          }
        }
      }),
    Doubt.countDocuments(query),
  ]);

  return { doubts, total };
}

// ═══════════════════════════════════════════════════
// SINGLE DOUBT DETAIL
// ═══════════════════════════════════════════════════

async function getDoubtById(doubtId) {
  const doubt = await Doubt.findById(doubtId)
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'fullName email' }
    })
    .populate({
      path: 'topicId',
      select: 'id title',
      populate: { path: 'subjectId', select: 'id name' }
    });

  if (!doubt) throw new AppError("Doubt not found.", 404);

  const responses = await DoubtResponse.find({ doubtId })
    .sort({ createdAt: 1 })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'fullName' }
    });

  const doubtObj = doubt.toObject();
  doubtObj.responses = responses;

  return doubtObj;
}

module.exports = {
  submitDoubt,
  getStudentDoubts,
  getTopicQAThread,
  getTeacherDoubtQueue,
  respondToDoubt,
  updateDoubtStatus,
  getUnresolvedDoubts,
  getDoubtById,
};

const mongoose = require("mongoose");
const { AppError } = require("../../utils/apiResponse");
const engagementService = require("../engagement/engagement.service");

const ParentLink = require("../../models/ParentLink");
const StudentProfile = require("../../models/StudentProfile");
const EngagementEvent = require("../../models/EngagementEvent");
const Doubt = require("../../models/Doubt");
const Subject = require("../../models/Subject");
const ParentMessage = require("../../models/ParentMessage");

// ═══════════════════════════════════════════════════
// PARENT DASHBOARD
// ═══════════════════════════════════════════════════

async function getLinkedChildren(parentUserId) {
  const links = await ParentLink.find({ parentId: parentUserId })
    .populate({
      path: 'studentId',
      select: 'id fullName email'
    });

  const studentIds = links.map(l => l.studentId._id);
  
  const profiles = await StudentProfile.find({ userId: { $in: studentIds } })
    .populate('boardId', 'name')
    .populate('classId', 'name')
    .populate('programId', 'name');

  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.userId.toString()] = p;
  });

  return links.map((l) => {
    const p = profileMap[l.studentId._id.toString()];
    return {
      userId: l.studentId._id,
      fullName: l.studentId.fullName,
      profileId: p?._id,
      board: p?.boardId?.name,
      class: p?.classId?.name,
      program: p?.programId?.name,
    };
  });
}

async function getDashboard(parentUserId) {
  const children = await getLinkedChildren(parentUserId);

  if (children.length === 0) {
    return { children: [], activeChild: null, attentionScore: null, progress: null };
  }

  const child = children[0];

  if (!child.profileId) {
    return { children, activeChild: child, attentionScore: null, progress: null };
  }

  const [attentionScore, progress] = await Promise.all([
    engagementService.computeAttentionScore(child.profileId),
    engagementService.getStudentProgress(child.profileId),
  ]);

  const recentDoubts = await Doubt.countDocuments({
    studentId: child.profileId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  });

  const lastEvent = await EngagementEvent.findOne({ studentId: child.profileId })
    .sort({ createdAt: -1 })
    .select('createdAt');

  return {
    children,
    activeChild: child,
    attentionScore,
    progress: progress.summary,
    subjects: progress.subjects,
    recentDoubts,
    lastActiveAt: lastEvent?.createdAt || null,
  };
}

async function getChildProgress(parentUserId, childUserId) {
  const link = await ParentLink.findOne({
    parentId: parentUserId,
    studentId: childUserId,
  });
  if (!link) throw new AppError("No linked child found.", 403);

  const profile = await StudentProfile.findOne({ userId: childUserId });
  if (!profile) throw new AppError("Student profile not found.", 404);

  return engagementService.getStudentProgress(profile._id);
}

// ═══════════════════════════════════════════════════
// PARENT-TEACHER MESSAGING
// ═══════════════════════════════════════════════════

async function getMessageThreads(parentUserId) {
  const links = await ParentLink.find({ parentId: parentUserId }).select('studentId');
  const studentIds = links.map((l) => l.studentId);
  
  if (studentIds.length === 0) return [];

  const profiles = await StudentProfile.find({ userId: { $in: studentIds } })
    .populate('userId', 'id fullName');

  const threads = [];

  for (const profile of profiles) {
    if (!profile.classId) continue;

    const subjects = await Subject.find({ classId: profile.classId, isActive: true })
      .populate({
        path: 'teacherSubjects',
        populate: {
          path: 'teacherId',
          populate: { path: 'userId', select: 'id fullName' }
        }
      });

    for (const subject of subjects) {
      if (!subject.teacherSubjects || subject.teacherSubjects.length === 0) continue;
      const teacher = subject.teacherSubjects[0].teacherId;

      const lastMessage = await ParentMessage.findOne({
        parentId: parentUserId,
        teacherId: teacher.userId._id,
        subjectId: subject._id,
        studentId: profile.userId._id,
      }).sort({ createdAt: -1 });

      const unreadCount = await ParentMessage.countDocuments({
        parentId: parentUserId,
        teacherId: teacher.userId._id,
        subjectId: subject._id,
        studentId: profile.userId._id,
        isFromParent: false,
      });

      threads.push({
        teacherId: teacher.userId._id,
        teacherName: teacher.userId.fullName,
        subjectId: subject._id,
        subjectName: subject.name,
        studentId: profile.userId._id,
        studentName: profile.userId.fullName,
        lastMessage: lastMessage?.message?.slice(0, 80) || null,
        lastMessageAt: lastMessage?.createdAt || null,
        unreadCount,
      });
    }
  }

  return threads.sort((a, b) =>
    (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0)
  );
}

async function getMessages(parentUserId, teacherId, subjectId, { page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;

  const link = await ParentLink.findOne({ parentId: parentUserId });
  if (!link) throw new AppError("No linked child found.", 403);

  const [messages, total] = await Promise.all([
    ParentMessage.find({ parentId: parentUserId, teacherId, subjectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ParentMessage.countDocuments({ parentId: parentUserId, teacherId, subjectId }),
  ]);

  return { messages: messages.reverse(), total };
}

async function sendMessage(parentUserId, data) {
  const { teacherId, subjectId, message } = data;

  const link = await ParentLink.findOne({ parentId: parentUserId });
  if (!link) throw new AppError("No linked child found.", 403);

  const msg = await ParentMessage.create({
    parentId: parentUserId,
    teacherId,
    studentId: link.studentId,
    subjectId,
    message,
    isFromParent: true,
  });

  return msg;
}

async function getTeacherParentMessages(teacherUserId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    ParentMessage.find({ teacherId: teacherUserId, isFromParent: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ParentMessage.countDocuments({ teacherId: teacherUserId, isFromParent: true }),
  ]);

  return { messages, total };
}

async function teacherReplyToParent(teacherUserId, data) {
  const { parentId, subjectId, studentId, message } = data;

  return ParentMessage.create({
    parentId,
    teacherId: teacherUserId,
    studentId,
    subjectId,
    message,
    isFromParent: false,
  });
}

module.exports = {
  getLinkedChildren,
  getDashboard,
  getChildProgress,
  getMessageThreads,
  getMessages,
  sendMessage,
  getTeacherParentMessages,
  teacherReplyToParent,
};

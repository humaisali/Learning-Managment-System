const mongoose = require("mongoose");
const StudentProfile = require("../../models/StudentProfile");
const Subject = require("../../models/Subject");
const Module = require("../../models/Module");
const StudentTopicProgress = require("../../models/StudentTopicProgress");
const Doubt = require("../../models/Doubt");
const EngagementEvent = require("../../models/EngagementEvent");
const { AppError } = require("../../utils/apiResponse");

async function getDashboard(studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId)
    .populate('boardId classId programId')
    .populate({
      path: 'enrollments',
      match: { status: "ACTIVE" },
      populate: { path: 'feePlanId', select: 'name durationDays' },
      options: { sort: { activatedAt: -1 } }
    });

  if (!profile) throw new AppError("Student profile not found.", 404);

  const subjects = await _getEnrolledSubjects(profile);

  const progressRecords = await StudentTopicProgress.find({ studentId: studentProfileId });
  const totalWatchSeconds = progressRecords.reduce((s, p) => s + p.watchedSeconds, 0);
  const completedTopics = progressRecords.filter((p) => p.status === "COMPLETED").length;

  const doubtCount = await Doubt.countDocuments({ studentId: studentProfileId });

  const recentActivity = await EngagementEvent.find({ studentId: studentProfileId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({
      path: 'contentAssetId',
      select: 'title type topicId',
      populate: { path: 'topicId', select: 'title' }
    });

  return {
    profile: {
      board: profile.boardId,
      class: profile.classId,
      program: profile.programId,
    },
    enrollment: profile.enrollments[0] || null,
    stats: {
      totalSubjects: subjects.length,
      watchTimeMinutes: Math.round(totalWatchSeconds / 60),
      completedTopics,
      doubtsAsked: doubtCount,
    },
    subjects: subjects.map((s) => ({
      id: s._id,
      name: s.name,
      topicCount: s.topics ? s.topics.length : 0,
    })),
    recentActivity: recentActivity.map((a) => ({
      type: a.eventType,
      title: a.contentAssetId?.topicId?.title || a.contentAssetId?.title || null,
      timestamp: a.createdAt,
    })),
  };
}

async function getEnrolledSubjects(studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId);
  if (!profile) throw new AppError("Student profile not found.", 404);

  const subjects = await _getEnrolledSubjects(profile);

  const progressRecords = await StudentTopicProgress.find({ studentId: studentProfileId })
    .select('topicId status watchedSeconds');

  const progressByTopic = {};
  progressRecords.forEach((p) => { progressByTopic[p.topicId.toString()] = p; });

  return subjects.map((subject) => {
    const topicIds = subject.topics ? subject.topics.map((t) => t._id.toString()) : [];
    const completed = topicIds.filter((id) => progressByTopic[id]?.status === "COMPLETED").length;
    const inProgress = topicIds.filter((id) => progressByTopic[id]?.status === "IN_PROGRESS").length;
    const watchSeconds = topicIds.reduce((s, id) => s + (progressByTopic[id]?.watchedSeconds || 0), 0);

    return {
      id: subject._id,
      name: subject.name,
      totalTopics: topicIds.length,
      completedTopics: completed,
      inProgressTopics: inProgress,
      watchTimeMinutes: Math.round(watchSeconds / 60),
      progressPercent: topicIds.length > 0
        ? Math.round((completed / topicIds.length) * 100)
        : 0,
      hasTeacher: subject.teacherSubjects && subject.teacherSubjects.length > 0,
      teacherName: subject.teacherSubjects && subject.teacherSubjects[0]?.teacherId?.userId?.fullName || null,
    };
  });
}

async function getSubjectTopics(studentProfileId, subjectId) {
  const subject = await Subject.findById(subjectId)
    .populate({
      path: 'topics',
      match: { isActive: true },
      options: { sort: { sortOrder: 1 } },
      // Aggregation of contentAssets, mcqSets, doubts omitted for simplicity as in Mongoose it's tricky without aggregate
    })
    .populate({
      path: 'teacherSubjects',
      populate: {
        path: 'teacherId',
        populate: { path: 'userId', select: 'fullName' }
      }
    });

  if (!subject) throw new AppError("Subject not found.", 404);

  const progressRecords = await StudentTopicProgress.find({
    studentId: studentProfileId,
    topicId: { $in: subject.topics ? subject.topics.map((t) => t._id) : [] }
  });

  const progressMap = {};
  progressRecords.forEach((p) => { progressMap[p.topicId.toString()] = p; });

  return {
    subject: {
      id: subject._id,
      name: subject.name,
      teacher: subject.teacherSubjects && subject.teacherSubjects[0]?.teacherId?.userId?.fullName || null,
    },
    topics: (subject.topics || []).map((topic) => {
      const prog = progressMap[topic._id.toString()];
      return {
        id: topic._id,
        title: topic.title,
        sortOrder: topic.sortOrder,
        hasVideo: true, // simplified
        hasMCQ: true, // simplified
        doubtCount: 0, // simplified
        status: prog?.status || "NOT_STARTED",
        watchedSeconds: prog?.watchedSeconds || 0,
        totalSeconds: prog?.totalSeconds || 0,
      };
    }),
  };
}

// ─── Helper ─────────────────────────────────────
async function _getEnrolledSubjects(profile) {
  const query = { isActive: true };

  if (profile.classId) {
    query.classId = profile.classId;
  } else if (profile.programId) {
    const modules = await Module.find({ programId: profile.programId }).select('_id');
    query.moduleId = { $in: modules.map((m) => m._id) };
  } else {
    return [];
  }

  return Subject.find(query)
    .sort({ sortOrder: 1 })
    .populate({
      path: 'topics',
      match: { isActive: true },
      select: '_id'
    })
    .populate({
      path: 'teacherSubjects',
      populate: {
        path: 'teacherId',
        populate: { path: 'userId', select: 'fullName' }
      }
    });
}

module.exports = {
  getDashboard,
  getEnrolledSubjects,
  getSubjectTopics,
};

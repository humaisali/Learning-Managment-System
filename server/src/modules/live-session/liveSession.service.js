const mongoose = require("mongoose");
const { AppError } = require("../../utils/apiResponse");
const logger = require("../../utils/logger");
const { getLiveProvider } = require("../../providers/live/mux.provider");
const { emitToUser, emitToSubject, getIO } = require("../../socket");
const notificationService = require("../notification/notification.service");

const Topic = require("../../models/Topic");
const LiveSession = require("../../models/LiveSession");
const TeacherSubject = require("../../models/TeacherSubject");
const Subject = require("../../models/Subject");
const StudentProfile = require("../../models/StudentProfile");

// ═══════════════════════════════════════════════════
// CREATE SESSION
// ═══════════════════════════════════════════════════

async function createSession(teacherProfileId, data) {
  const { topicId, scheduledAt } = data;

  const topic = await Topic.findById(topicId).populate('subjectId');
  if (!topic) throw new AppError("Topic not found.", 404);

  // Verify teacher assignment
  const assignment = await TeacherSubject.findOne({
    teacherId: teacherProfileId,
    subjectId: topic.subjectId._id || topic.subjectId,
  });
  if (!assignment) throw new AppError("You are not assigned to this subject.", 403);

  // Create Mux live stream
  const muxProvider = getLiveProvider();
  const stream = await muxProvider.createLiveStream({ topicTitle: topic.title });

  const session = await LiveSession.create({
    topicId,
    teacherId: teacherProfileId,
    status: scheduledAt ? "SCHEDULED" : "SCHEDULED",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    muxStreamKey: stream.streamKey,
    muxPlaybackId: stream.playbackId,
  });

  const populatedSession = await LiveSession.findById(session._id)
    .populate({
      path: 'topicId',
      select: 'title',
      populate: { path: 'subjectId', select: 'id name' }
    })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'fullName' }
    });

  const teacherName = populatedSession.teacherId.userId.fullName;

  // Find students enrolled in the subject's class
  const subjectWithClass = await Subject.findById(topic.subjectId._id || topic.subjectId).select('classId');

  if (subjectWithClass && subjectWithClass.classId) {
    const students = await StudentProfile.find({ classId: subjectWithClass.classId })
      .populate('userId', 'id');

    // Socket broadcast to subject room
    emitToSubject((topic.subjectId._id || topic.subjectId).toString(), "live:scheduled", {
      sessionId: session._id,
      topicId,
      topicTitle: topic.title,
      teacherName,
      scheduledAt: session.scheduledAt,
    });

    // Email notifications (async, don't block response)
    for (const student of students.slice(0, 100)) {
      if (student.userId) {
        notificationService.templates.liveSessionScheduled(
          student.userId._id.toString(), teacherName, topic.title, session.scheduledAt || new Date()
        ).catch(() => {});
      }
    }
  }

  logger.info("Live session created", { sessionId: session._id, topicId });

  return {
    ...populatedSession.toObject(),
    streamKey: stream.streamKey,
    rtmpUrl: stream.rtmpUrl || "rtmps://global-live.mux.com:443/app",
    playbackUrl: stream.playbackUrl,
  };
}

// ═══════════════════════════════════════════════════
// START SESSION (GO LIVE)
// ═══════════════════════════════════════════════════

async function startSession(sessionId, teacherProfileId) {
  const session = await LiveSession.findById(sessionId)
    .populate({ path: 'topicId', select: 'title subjectId' })
    .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } });

  if (!session) throw new AppError("Session not found.", 404);
  if (session.teacherId._id.toString() !== teacherProfileId.toString()) {
    throw new AppError("Only the session creator can start it.", 403);
  }
  if (session.status === "LIVE") return session;
  if (session.status === "ENDED") throw new AppError("This session has already ended.", 400);

  const updated = await LiveSession.findByIdAndUpdate(
    sessionId,
    { status: "LIVE", startedAt: new Date() },
    { new: true }
  );

  const playbackUrl = session.muxPlaybackId
    ? `https://stream.mux.com/${session.muxPlaybackId}.m3u8`
    : null;

  // Broadcast to all students in the subject
  emitToSubject((session.topicId.subjectId._id || session.topicId.subjectId).toString(), "live:started", {
    sessionId,
    topicTitle: session.topicId.title,
    teacherName: session.teacherId.userId.fullName,
    playbackUrl,
  });

  logger.info("Live session started", { sessionId });

  return { ...updated.toObject(), playbackUrl };
}

// ═══════════════════════════════════════════════════
// END SESSION
// ═══════════════════════════════════════════════════

async function endSession(sessionId, teacherProfileId) {
  const session = await LiveSession.findById(sessionId)
    .populate({ path: 'topicId', select: 'title subjectId' });

  if (!session) throw new AppError("Session not found.", 404);
  if (session.teacherId.toString() !== teacherProfileId.toString()) {
    throw new AppError("Only the session creator can end it.", 403);
  }
  if (session.status === "ENDED") return session;

  const muxProvider = getLiveProvider();
  try {
    const streamStatus = await muxProvider.getStreamStatus(session.muxStreamKey);
    const recordingAssetId = streamStatus.activeAssetId || streamStatus.recentAssetIds?.[0];

    let recordingUrl = null;
    if (recordingAssetId) {
      const recording = await muxProvider.getRecording(recordingAssetId);
      recordingUrl = recording.playbackUrl;
    }

    await muxProvider.disableStream(session.muxStreamKey);

    const updated = await LiveSession.findByIdAndUpdate(
      sessionId,
      { status: "ENDED", endedAt: new Date(), recordingUrl },
      { new: true }
    );

    emitToSubject((session.topicId.subjectId._id || session.topicId.subjectId).toString(), "live:ended", {
      sessionId,
      recordingAvailable: !!recordingUrl,
    });

    try {
      const io = getIO();
      const roomName = `live:${sessionId}`;
      io.in(roomName).socketsLeave(roomName);
    } catch {}

    logger.info("Live session ended", { sessionId, hasRecording: !!recordingUrl });

    return updated;
  } catch (error) {
    logger.error("Error ending live session", { sessionId, error: error.message });
    return LiveSession.findByIdAndUpdate(
      sessionId,
      { status: "ENDED", endedAt: new Date() },
      { new: true }
    );
  }
}

// ═══════════════════════════════════════════════════
// GET SESSION (for student to watch)
// ═══════════════════════════════════════════════════

async function getSession(sessionId) {
  const session = await LiveSession.findById(sessionId)
    .populate({
      path: 'topicId',
      select: 'id title',
      populate: { path: 'subjectId', select: 'id name' }
    })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'fullName' }
    });

  if (!session) throw new AppError("Session not found.", 404);

  const playbackUrl = session.muxPlaybackId
    ? `https://stream.mux.com/${session.muxPlaybackId}.m3u8`
    : null;

  return {
    id: session._id,
    topic: session.topicId,
    teacher: session.teacherId.userId.fullName,
    status: session.status,
    scheduledAt: session.scheduledAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    playbackUrl: session.status === "LIVE" ? playbackUrl : null,
    recordingUrl: session.status === "ENDED" ? session.recordingUrl : null,
    participantCount: session.participantCount,
  };
}

// ═══════════════════════════════════════════════════
// LIST SESSIONS
// ═══════════════════════════════════════════════════

async function getUpcomingSessions(studentProfileId) {
  const profile = await StudentProfile.findById(studentProfileId).select('classId');

  if (!profile || !profile.classId) return [];

  const subjects = await Subject.find({ classId: profile.classId, isActive: true }).select('_id');
  const subjectIds = subjects.map((s) => s._id);

  const topics = await Topic.find({ subjectId: { $in: subjectIds } }).select('_id');
  const topicIds = topics.map((t) => t._id);

  return LiveSession.find({
    status: { $in: ["SCHEDULED", "LIVE"] },
    topicId: { $in: topicIds },
  })
    .sort({ status: -1, scheduledAt: 1 })
    .limit(20)
    .populate({
      path: 'topicId',
      select: 'title',
      populate: { path: 'subjectId', select: 'name' }
    })
    .populate({
      path: 'teacherId',
      populate: { path: 'userId', select: 'fullName' }
    });
}

async function getTeacherSessions(teacherProfileId, { status } = {}) {
  const query = { teacherId: teacherProfileId };
  if (status) query.status = status;

  return LiveSession.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate({
      path: 'topicId',
      select: 'title',
      populate: { path: 'subjectId', select: 'name' }
    });
}

// ═══════════════════════════════════════════════════
// PARTICIPANT COUNT
// ═══════════════════════════════════════════════════

async function incrementParticipant(sessionId) {
  return LiveSession.findByIdAndUpdate(
    sessionId,
    { $inc: { participantCount: 1 } },
    { new: true }
  );
}

module.exports = {
  createSession,
  startSession,
  endSession,
  getSession,
  getUpcomingSessions,
  getTeacherSessions,
  incrementParticipant,
};

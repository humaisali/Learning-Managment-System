const liveSessionService = require("./liveSession.service");
const { sendSuccess } = require("../../utils/apiResponse");
const prisma = require("../../config/database");

async function _getTeacherProfileId(userId) {
  const p = await prisma.teacherProfile.findUnique({ where: { userId } });
  if (!p) throw new Error("Teacher profile not found.");
  return p.id;
}

async function _getStudentProfileId(userId) {
  const p = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!p) throw new Error("Student profile not found.");
  return p.id;
}

async function createSession(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await liveSessionService.createSession(teacherId, req.body);
    return sendSuccess(res, result, "Session created.", 201);
  } catch (error) { next(error); }
}

async function startSession(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await liveSessionService.startSession(req.params.id, teacherId);
    return sendSuccess(res, result, "Session is live.");
  } catch (error) { next(error); }
}

async function endSession(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await liveSessionService.endSession(req.params.id, teacherId);
    return sendSuccess(res, result, "Session ended.");
  } catch (error) { next(error); }
}

async function getSession(req, res, next) {
  try {
    const result = await liveSessionService.getSession(req.params.id);
    return sendSuccess(res, result);
  } catch (error) { next(error); }
}

async function getUpcomingSessions(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const sessions = await liveSessionService.getUpcomingSessions(studentId);
    return sendSuccess(res, sessions, "Upcoming sessions.");
  } catch (error) { next(error); }
}

async function getTeacherSessions(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const sessions = await liveSessionService.getTeacherSessions(teacherId, {
      status: req.query.status,
    });
    return sendSuccess(res, sessions);
  } catch (error) { next(error); }
}

module.exports = {
  createSession, startSession, endSession,
  getSession, getUpcomingSessions, getTeacherSessions,
};

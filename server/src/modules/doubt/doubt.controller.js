const doubtService = require("./doubt.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");
const prisma = require("../../config/database");

async function _getStudentProfileId(userId) {
  const p = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!p) throw new Error("Student profile not found.");
  return p.id;
}

async function _getTeacherProfileId(userId) {
  const p = await prisma.teacherProfile.findUnique({ where: { userId } });
  if (!p) throw new Error("Teacher profile not found.");
  return p.id;
}

// ─── Student ────────────────────────────────────
async function submitDoubt(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const result = await doubtService.submitDoubt(studentId, req.body);
    return sendSuccess(res, result, "Doubt submitted.", 201);
  } catch (error) { next(error); }
}

async function getMyDoubts(req, res, next) {
  try {
    const studentId = await _getStudentProfileId(req.user.id);
    const { page, limit, skip } = parsePagination(req.query);
    const { doubts, total } = await doubtService.getStudentDoubts(studentId, {
      page, limit, skip, status: req.query.status,
    });
    return sendPaginated(res, doubts, total, page, limit);
  } catch (error) { next(error); }
}

async function getTopicQA(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { doubts, total } = await doubtService.getTopicQAThread(req.params.topicId, {
      page, limit, skip,
    });
    return sendPaginated(res, doubts, total, page, limit);
  } catch (error) { next(error); }
}

async function getDoubtDetail(req, res, next) {
  try {
    const doubt = await doubtService.getDoubtById(req.params.id);
    return sendSuccess(res, doubt);
  } catch (error) { next(error); }
}

// ─── Teacher ────────────────────────────────────
async function getTeacherQueue(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const { page, limit, skip } = parsePagination(req.query);
    const { doubts, total } = await doubtService.getTeacherDoubtQueue(teacherId, {
      page, limit, skip,
      status: req.query.status,
      subjectId: req.query.subjectId,
      topicId: req.query.topicId,
    });
    return sendPaginated(res, doubts, total, page, limit);
  } catch (error) { next(error); }
}

async function respondToDoubt(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await doubtService.respondToDoubt(teacherId, req.params.id, req.body);
    return sendSuccess(res, result, "Response added.", 201);
  } catch (error) { next(error); }
}

async function updateDoubtStatus(req, res, next) {
  try {
    const teacherId = await _getTeacherProfileId(req.user.id);
    const result = await doubtService.updateDoubtStatus(teacherId, req.params.id, req.body.status);
    return sendSuccess(res, result, "Status updated.");
  } catch (error) { next(error); }
}

// ─── Admin ──────────────────────────────────────
async function getUnresolvedDoubts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const agedOnly = req.query.agedOnly === "true";
    const { doubts, total } = await doubtService.getUnresolvedDoubts({ page, limit, skip, agedOnly });
    return sendPaginated(res, doubts, total, page, limit);
  } catch (error) { next(error); }
}

module.exports = {
  submitDoubt, getMyDoubts, getTopicQA, getDoubtDetail,
  getTeacherQueue, respondToDoubt, updateDoubtStatus,
  getUnresolvedDoubts,
};

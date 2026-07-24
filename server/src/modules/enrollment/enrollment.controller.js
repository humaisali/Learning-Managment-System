const enrollmentService = require("./enrollment.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");

async function listFeePlans(req, res, next) {
  try {
    const plans = await enrollmentService.listFeePlans({
      learningType: req.query.learningType,
      classId: req.query.classId,
      programId: req.query.programId,
      includeInactive: req.query.includeInactive === "true",
    });
    return sendSuccess(res, plans, "Fee plans retrieved.");
  } catch (error) { next(error); }
}

async function createFeePlan(req, res, next) {
  try {
    const plan = await enrollmentService.createFeePlan(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, plan, "Fee plan created.", 201);
  } catch (error) { next(error); }
}

async function updateFeePlan(req, res, next) {
  try {
    const plan = await enrollmentService.updateFeePlan(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, plan, "Fee plan updated.");
  } catch (error) { next(error); }
}

async function createEnrollment(req, res, next) {
  try {
    const { studentProfileId, feePlanId } = req.body;
    const enrollment = await enrollmentService.createEnrollment(studentProfileId, feePlanId);
    return sendSuccess(res, enrollment, "Enrollment created.", 201);
  } catch (error) { next(error); }
}

async function listEnrollments(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, studentId, search } = req.query;

    const { enrollments, total } = await enrollmentService.listEnrollments({
      page, limit, skip, status, studentId, search,
    });

    return sendPaginated(res, enrollments, total, page, limit, "Enrollments retrieved.");
  } catch (error) { next(error); }
}

module.exports = { listFeePlans, createFeePlan, updateFeePlan, createEnrollment, listEnrollments };

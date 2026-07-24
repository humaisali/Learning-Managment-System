const adminService = require("./admin.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");

async function getDashboard(req, res, next) {
  try {
    const metrics = await adminService.getDashboardMetrics();
    return sendSuccess(res, metrics, "Dashboard metrics loaded.");
  } catch (error) { next(error); }
}

async function listComplaints(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, type, search } = req.query;
    const { complaints, total } = await adminService.listComplaints({ page, limit, skip, status, type, search });
    return sendPaginated(res, complaints, total, page, limit);
  } catch (error) { next(error); }
}

async function createComplaint(req, res, next) {
  try {
    const complaint = await adminService.createComplaint(req.user.id, req.body);
    return sendSuccess(res, complaint, "Complaint submitted.", 201);
  } catch (error) { next(error); }
}

async function updateComplaint(req, res, next) {
  try {
    const result = await adminService.updateComplaint(req.params.id, req.body, req.user.id, req.clientIp);
    return sendSuccess(res, result, "Complaint updated.");
  } catch (error) { next(error); }
}

async function getContentActivity(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { assets, total } = await adminService.getContentActivity({ page, limit, skip });
    return sendPaginated(res, assets, total, page, limit);
  } catch (error) { next(error); }
}

async function getEngagementSummary(req, res, next) {
  try {
    const result = await adminService.getEngagementSummary();
    return sendSuccess(res, result);
  } catch (error) { next(error); }
}

async function getAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { actorId, action, targetType } = req.query;
    const { logs, total } = await adminService.getAuditLogs({ page, limit, skip, actorId, action, targetType });
    return sendPaginated(res, logs, total, page, limit);
  } catch (error) { next(error); }
}

module.exports = { getDashboard, listComplaints, createComplaint, updateComplaint, getContentActivity, getEngagementSummary, getAuditLogs };

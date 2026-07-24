const parentService = require("./parent.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");

async function getDashboard(req, res, next) {
  try {
    const result = await parentService.getDashboard(req.user.id);
    return sendSuccess(res, result, "Dashboard loaded.");
  } catch (error) { next(error); }
}

async function getChildProgress(req, res, next) {
  try {
    const result = await parentService.getChildProgress(req.user.id, req.params.childId);
    return sendSuccess(res, result, "Progress retrieved.");
  } catch (error) { next(error); }
}

async function getMessageThreads(req, res, next) {
  try {
    const threads = await parentService.getMessageThreads(req.user.id);
    return sendSuccess(res, threads, "Threads retrieved.");
  } catch (error) { next(error); }
}

async function getMessages(req, res, next) {
  try {
    const { teacherId, subjectId } = req.params;
    const { page, limit } = parsePagination(req.query);
    const result = await parentService.getMessages(req.user.id, teacherId, subjectId, { page, limit });
    return sendPaginated(res, result.messages, result.total, page, limit);
  } catch (error) { next(error); }
}

async function sendMessage(req, res, next) {
  try {
    const msg = await parentService.sendMessage(req.user.id, req.body);
    return sendSuccess(res, msg, "Message sent.", 201);
  } catch (error) { next(error); }
}

module.exports = { getDashboard, getChildProgress, getMessageThreads, getMessages, sendMessage };

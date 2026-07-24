const usersService = require("./users.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");

async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { role, status, search } = req.query;

    const { users, total } = await usersService.listUsers({
      page, limit, skip, role, status, search,
    });

    return sendPaginated(res, users, total, page, limit, "Users retrieved.");
  } catch (error) { next(error); }
}

async function getUserById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    return sendSuccess(res, user, "User retrieved.");
  } catch (error) { next(error); }
}

async function suspendUser(req, res, next) {
  try {
    const { reason } = req.body;
    const user = await usersService.suspendUser(req.params.id, reason, req.user.id, req.clientIp);
    return sendSuccess(res, { id: user.id, isSuspended: true }, "User suspended.");
  } catch (error) { next(error); }
}

async function reactivateUser(req, res, next) {
  try {
    const user = await usersService.reactivateUser(req.params.id, req.user.id, req.clientIp);
    return sendSuccess(res, { id: user.id, isSuspended: false }, "User reactivated.");
  } catch (error) { next(error); }
}

async function createStaffUser(req, res, next) {
  try {
    const user = await usersService.createStaffUser(req.body, req.user.id, req.clientIp);
    return sendSuccess(res, { id: user.id, role: user.role, fullName: user.fullName }, "Staff user created.", 201);
  } catch (error) { next(error); }
}

module.exports = { listUsers, getUserById, suspendUser, reactivateUser, createStaffUser };

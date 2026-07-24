const notificationService = require("./notification.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");

async function getMyNotifications(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const result = await notificationService.getUserNotifications(req.user.id, { page, limit });
    return sendPaginated(
      res, result.notifications, result.total, page, limit,
      `${result.unreadCount} unread notifications.`
    );
  } catch (error) { next(error); }
}

async function markAsRead(req, res, next) {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, null, "Marked as read.");
  } catch (error) { next(error); }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, null, "All notifications marked as read.");
  } catch (error) { next(error); }
}

module.exports = { getMyNotifications, markAsRead, markAllAsRead };

const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

/**
 * Creates an audit log entry for sensitive admin actions.
 * Call this from service functions, not as route middleware,
 * to ensure it captures before/after state accurately.
 */
async function createAuditLog({ actorId, action, targetType, targetId, before = null, after = null, ipAddress = null }) {
  try {
    await AuditLog.create({
      actorId,
      action,
      targetType,
      targetId,
      before: before || undefined,
      after: after || undefined,
      ipAddress,
    });
  } catch (error) {
    // Audit failures should never break the main operation
    // but they must be logged for monitoring
    logger.error("Failed to write audit log", {
      error: error.message,
      actorId,
      action,
      targetType,
      targetId,
    });
  }
}

/**
 * Express middleware that attaches the client IP to the request
 * for audit logging downstream.
 */
function attachClientIp(req, res, next) {
  req.clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;
  next();
}

module.exports = { createAuditLog, attachClientIp };

const logger = require("../utils/logger");
const { sendError } = require("../utils/apiResponse");
const config = require("../config");

/**
 * Global error handling middleware. Must be registered last in the middleware chain.
 * Handles operational errors (AppError) differently from unexpected errors.
 */
function errorHandler(err, req, res, _next) {
  // Default to 500 if no status code set
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log the error
  if (statusCode >= 500) {
    logger.error("Unhandled server error", {
      message: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id || "anonymous",
      ip: req.ip,
    });
  } else {
    logger.warn("Client error", {
      message: err.message,
      statusCode,
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id || "anonymous",
    });
  }

  // In production, don't leak internal error details
  const message =
    isOperational || config.env !== "production"
      ? err.message
      : "An unexpected error occurred. Please try again later.";

  return sendError(res, message, statusCode, err.errors || null);
}

/**
 * Catches unmatched routes and forwards a 404 error.
 */
function notFoundHandler(req, res, next) {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
}

module.exports = { errorHandler, notFoundHandler };

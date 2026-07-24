/**
 * Standardized API response format used across all endpoints.
 * Every response follows: { success, data?, message?, errors?, meta? }
 */

class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function sendSuccess(res, data = null, message = "Success", statusCode = 200, meta = null) {
  const response = { success: true, message };

  if (data !== null) response.data = data;
  if (meta) response.meta = meta;

  return res.status(statusCode).json(response);
}

function sendError(res, message = "Something went wrong", statusCode = 500, errors = null) {
  const response = { success: false, message };

  if (errors) response.errors = errors;

  return res.status(statusCode).json(response);
}

function sendPaginated(res, data, total, page, limit, message = "Success") {
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

module.exports = { AppError, sendSuccess, sendError, sendPaginated };

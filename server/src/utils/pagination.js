/**
 * Extracts pagination params from request query string.
 * Defaults: page=1, limit=20, maxLimit=100
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Extracts sort params from request query.
 * Example: ?sortBy=createdAt&sortOrder=desc
 */
function parseSort(query, allowedFields = ["createdAt"]) {
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return { [sortBy]: sortOrder };
}

module.exports = { parsePagination, parseSort };

const { AppError } = require("../utils/apiResponse");

/**
 * Role-based access control middleware.
 * Accepts one or more roles that are allowed to access the route.
 *
 * Usage:
 *   router.get("/admin/dashboard", authenticate, authorize("HEAD_OFFICE", "SYSTEM_ADMIN"), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to access this resource.",
          403
        )
      );
    }

    next();
  };
}

/**
 * Ensures the authenticated user can only access their own resources.
 * Checks req.params[paramName] against req.user.id.
 * Admins and head office bypass this check.
 */
function authorizeOwnerOrAdmin(paramName = "userId") {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    const bypassRoles = ["HEAD_OFFICE", "SYSTEM_ADMIN"];
    if (bypassRoles.includes(req.user.role)) {
      return next();
    }

    const targetId = req.params[paramName];
    if (targetId && targetId !== req.user.id) {
      return next(
        new AppError("You can only access your own resources.", 403)
      );
    }

    next();
  };
}

// Role constants for cleaner route definitions
const ROLES = {
  STUDENT: "STUDENT",
  PARENT: "PARENT",
  CENTRAL_TEACHER: "CENTRAL_TEACHER",
  SUBJECT_TEACHER: "SUBJECT_TEACHER",
  HEAD_OFFICE: "HEAD_OFFICE",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
};

module.exports = { authorize, authorizeOwnerOrAdmin, ROLES };

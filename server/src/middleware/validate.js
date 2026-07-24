const { ZodError } = require("zod");
const { AppError } = require("../utils/apiResponse");

/**
 * Validates request data against a Zod schema.
 * Supports validating body, query, and params independently.
 *
 * Usage:
 *   router.post("/users", validate({ body: createUserSchema }), handler)
 *   router.get("/users", validate({ query: listUsersQuerySchema }), handler)
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        
        const errorMsg = formatted.map(f => `${f.field}: ${f.message}`).join(", ");

        return next(new AppError(`Validation failed: ${errorMsg}`, 422, formatted));
      }

      next(error);
    }
  };
}

module.exports = { validate };

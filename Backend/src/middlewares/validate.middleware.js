/**
 * Validation Middleware
 * Validates request data against Zod schemas
 * Compatible with Zod v4 (uses error.issues)
 */

import { ApiError } from "../utils/ApiError.js";

/**
 * Validate request against Zod schema
 * @param {Object} schema - Zod schema object
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      // Format Zod errors - Zod v4 uses error.issues (v3 used error.errors)
      const issues = error.issues || error.errors;
      if (issues && Array.isArray(issues)) {
        const formattedErrors = issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        throw new ApiError(
          400,
          "Validation failed",
          formattedErrors
        );
      }

      throw new ApiError(400, error.message || "Validation failed");
    }
  };
};

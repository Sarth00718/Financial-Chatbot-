/**
 * Admin Validation Schemas
 * Validates admin operations (Zod v4 compatible)
 */

import { z } from "zod";

/**
 * Update User Role Schema
 */
export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["user", "admin"]),
  }),
});

/**
 * Toggle User Status Schema
 */
export const toggleUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

/**
 * Get Users Query Schema
 */
export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.enum(["user", "admin"]).optional(),
    isActive: z.enum(["true", "false"]).optional(),
  }),
});

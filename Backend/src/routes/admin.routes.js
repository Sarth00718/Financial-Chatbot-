/**
 * Admin Routes
 * Handles admin operations and dashboard
 */

import express from "express";
import {
  getAllUsers,
  getUserDetails,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getDashboardStatistics,
  getSystemLogs,
  getSystemHealth,
} from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  updateUserRoleSchema,
  toggleUserStatusSchema,
  getUsersQuerySchema,
} from "../validators/admin.validator.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

// Dashboard statistics
router.get("/statistics", getDashboardStatistics);

// System health
router.get("/health", getSystemHealth);

// System logs
router.get("/logs", getSystemLogs);

// User management
router.get("/users", validate(getUsersQuerySchema), getAllUsers);
router.get("/users/:userId", getUserDetails);
router.patch("/users/:userId/role", validate(updateUserRoleSchema), updateUserRole);
router.patch("/users/:userId/status", validate(toggleUserStatusSchema), toggleUserStatus);
router.delete("/users/:userId", deleteUser);

export default router;

/**
 * Analytics Routes
 * Handles user and admin analytics
 */

import express from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  getUserAnalytics,
  getAdminAnalytics,
  exportAnalytics,
} from "../controllers/analytics.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User analytics (personal stats)
router.get("/user", getUserAnalytics);

// Admin analytics (system-wide stats)
router.get("/admin", authorize("admin"), getAdminAnalytics);

// Export analytics
router.get("/export", exportAnalytics);

export default router;

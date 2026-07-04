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

// Export analytics — admin only in production; any authenticated user in development
const exportAuth = process.env.NODE_ENV === "production" ? authorize("admin") : (req, res, next) => next();
router.get("/export", exportAuth, exportAnalytics);

export default router;

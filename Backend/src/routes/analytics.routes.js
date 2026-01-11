/**
 * Analytics Routes
 * Handles analytics and statistics endpoints
 */

import { Router } from "express";
import { getAnalyticsStats } from "../controllers/analytics.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication to all routes
router.use(protect);

// Get analytics stats
router.get("/stats", getAnalyticsStats);

export default router;

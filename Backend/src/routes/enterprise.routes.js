/**
 * Enterprise Routes
 * Enterprise AI analysis, watchlist, bookmarks, and advanced search
 */

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  runEnterpriseAnalysis,
  getAnalysisTypes,
  getAuditSummary,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getBookmarks,
  createBookmark,
  deleteBookmark,
  advancedSearch,
} from "../controllers/enterprise.controller.js";

const router = Router();

router.use(authenticate);

router.get("/analysis-types", getAnalysisTypes);
router.post("/analyze", runEnterpriseAnalysis);
router.post("/audit-summary", getAuditSummary);
router.get("/search", advancedSearch);

router.get("/watchlist", getWatchlist);
router.post("/watchlist", addToWatchlist);
router.delete("/watchlist/:id", removeFromWatchlist);

router.get("/bookmarks", getBookmarks);
router.post("/bookmarks", createBookmark);
router.delete("/bookmarks/:id", deleteBookmark);

export default router;

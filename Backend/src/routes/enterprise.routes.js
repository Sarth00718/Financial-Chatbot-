/**
 * Enterprise Routes
 * Enterprise AI analysis and advanced search
 */

import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  runEnterpriseAnalysis,
  getEnterpriseCharts,
  getAnalysisTypes,
  getAuditSummary,
  advancedSearch,
} from "../controllers/enterprise.controller.js";

const router = Router();

router.use(authenticate);

router.get("/analysis-types", getAnalysisTypes);
router.post("/analyze", runEnterpriseAnalysis);
router.post("/charts", getEnterpriseCharts);
router.post("/audit-summary", getAuditSummary);
router.get("/search", advancedSearch);

export default router;

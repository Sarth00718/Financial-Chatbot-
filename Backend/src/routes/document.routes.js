import { Router } from "express";
import {
  uploadDocuments,
  updateDocumentStatus,
  getConversationDocuments,
  deleteDocument,
} from "../controllers/document.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Webhook for Python service to update document status (no auth required)
router.patch("/:documentId/status", updateDocumentStatus);

// All other routes require authentication
router.use(authenticate);

// Upload documents with rate limiting
router.post(
  "/upload",
  uploadLimiter,
  upload.array("documents", 10), // Max 10 files
  uploadDocuments
);

// Get documents for a conversation
router.get(
  "/conversation/:conversationId",
  getConversationDocuments
);

// Delete a document
router.delete("/:documentId", deleteDocument);

export default router;

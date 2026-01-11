/**
 * Document Routes
 * Handles document upload and management
 */

import { Router } from "express";
import {
  uploadDocuments,
  updateDocumentStatus,
  getConversationDocuments,
  deleteDocument,
} from "../controllers/document.controller.js";
import { upload } from "../middlewares/upload.middleware.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

// Webhook for Python service to update document status (no auth needed)
router.patch("/:documentId/status", updateDocumentStatus);

// Apply authentication to all other routes
router.use(protect);

// Upload documents
router.post(
  "/upload",
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

// Webhook for Python service to update document status
router.patch("/:documentId/status", updateDocumentStatus);

export default router;

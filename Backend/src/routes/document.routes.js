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

/**
 * Webhook for Python service to update document status.
 * Protected by a shared secret header to prevent abuse.
 */
const webhookAuth = (req, res, next) => {
  const secret = process.env.WEBHOOK_SECRET;
  // If no secret is configured, only allow requests from localhost (dev mode)
  if (!secret) {
    const remoteIp = req.ip || req.socket?.remoteAddress || '';
    const isLocal = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
    if (isLocal) return next();
    return res.status(401).json({ success: false, message: 'Webhook authentication required' });
  }
  const provided = req.headers['x-webhook-secret'];
  if (!provided || provided !== secret) {
    return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
  }
  next();
};

router.patch("/:documentId/status", webhookAuth, updateDocumentStatus);

// All other routes require user authentication
router.use(authenticate);

router.post(
  "/upload",
  uploadLimiter,
  upload.array("documents", 10),
  uploadDocuments
);

router.get("/conversation/:conversationId", getConversationDocuments);

router.delete("/:documentId", deleteDocument);

export default router;

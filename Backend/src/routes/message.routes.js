/**
 * Message Routes
 * Handles message edit and delete operations
 */

import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { updateMessage, deleteMessage, editAndRegenerateMessage } from "../controllers/message.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Edit message and regenerate AI response
router.post("/:messageId/regenerate", editAndRegenerateMessage);

// Update message
router.patch("/:messageId", updateMessage);

// Delete message
router.delete("/:messageId", deleteMessage);

export default router;

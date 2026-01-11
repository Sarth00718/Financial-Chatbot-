/**
 * Conversation Routes
 * Handles conversation and message management
 */

import { Router } from "express";
import {
  getAllConversations,
  getConversationById,
  createConversation,
  sendChatMessage,
  deleteConversation,
  updateConversation,
} from "../controllers/conversation.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication to all routes - users must be logged in
router.use(protect);

// Conversation CRUD operations
router.route("/")
  .get(getAllConversations)      // Get all conversations
  .post(createConversation);     // Create new conversation

router.route("/:conversationId")
  .get(getConversationById)      // Get single conversation with messages
  .patch(updateConversation)     // Update conversation title
  .delete(deleteConversation);   // Delete conversation

// Send message in a conversation
router.post("/:conversationId/messages", sendChatMessage);

export default router;

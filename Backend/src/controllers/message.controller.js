/**
 * Message Controller
 * Handles message edit and delete operations
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Message } from "../models/Message.model.js";
import { Conversation } from "../models/Conversation.model.js";
import mongoose from "mongoose";

/**
 * Update a message
 * PATCH /api/v1/messages/:messageId
 */
export const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  // Validate input
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Message content cannot be empty");
  }

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message ID");
  }

  // Find message
  const message = await Message.findById(messageId).populate("conversation");

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Verify ownership - user can only edit their own messages
  if (message.conversation.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only edit your own messages");
  }

  // Prevent editing AI messages
  if (message.role !== "user") {
    throw new ApiError(403, "You can only edit user messages");
  }

  // Update message
  message.content = content.trim();
  await message.save();

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message updated successfully"));
});

/**
 * Edit message and regenerate AI response
 * POST /api/v1/messages/:messageId/regenerate
 */
export const editAndRegenerateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  // Validate input
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Message content cannot be empty");
  }

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message ID");
  }

  // Find message and populate conversation with documents
  const message = await Message.findById(messageId).populate({
    path: "conversation",
    populate: { path: "documents" },
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Verify ownership
  if (message.conversation.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only edit your own messages");
  }

  // Prevent editing AI messages
  if (message.role !== "user") {
    throw new ApiError(403, "You can only edit user messages");
  }

  // Update the user message
  message.content = content.trim();
  await message.save();

  // Find and delete all messages after this one (including the old AI response)
  await Message.deleteMany({
    conversation: message.conversation._id,
    createdAt: { $gt: message.createdAt },
  });

  // Get chat history up to this message
  const chatHistory = await Message.find({
    conversation: message.conversation._id,
    createdAt: { $lte: message.createdAt },
  })
    .sort({ createdAt: "asc" })
    .select("role content -_id")
    .limit(20);

  // Get vector namespaces from processed documents
  const vectorNamespaces = message.conversation.documents
    .filter((doc) => doc.status === "processed")
    .map((doc) => doc.vectorNamespace);

  // Call Python AI service for new response
  let aiContent;
  try {
    const axios = (await import("axios")).default;
    const response = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/query`,
      {
        question: content.trim(),
        chatHistory: chatHistory,
        vectorNamespaces: vectorNamespaces,
        featureUsed: message.conversation.featureUsed,
      },
      {
        timeout: 30000, // 30 second timeout
      }
    );
    aiContent = response.data.answer;
  } catch (error) {
    console.error("Error calling Python AI service:", error.message);
    throw new ApiError(
      502,
      "AI service is currently unavailable. Please try again later."
    );
  }

  if (!aiContent || aiContent.trim() === "") {
    throw new ApiError(500, "Received empty response from AI service");
  }

  // Save new AI response
  const assistantMessage = await Message.create({
    conversation: message.conversation._id,
    role: "assistant",
    content: aiContent,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          userMessage: message,
          assistantMessage,
        },
        "Message updated and response regenerated successfully"
      )
    );
});

/**
 * Delete a message
 * DELETE /api/v1/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message ID");
  }

  // Find message
  const message = await Message.findById(messageId).populate("conversation");

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Verify ownership
  if (message.conversation.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  // Prevent deleting AI messages
  if (message.role !== "user") {
    throw new ApiError(403, "You can only delete user messages");
  }

  // Delete message
  await message.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});

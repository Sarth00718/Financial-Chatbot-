/**
 * Conversation Controller
 * Handles conversation management and chat messages
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Conversation } from "../models/Conversation.model.js";
import { Message } from "../models/Message.model.js";
import { Document } from "../models/Document.model.js";
import { FEATURE_MODES } from "../config/constants.js";
import mongoose from "mongoose";
import axios from "axios";

/**
 * Get all conversations
 * GET /api/v1/conversations
 */
export const getAllConversations = asyncHandler(async (req, res) => {
  // Find all conversations for the authenticated user
  const conversations = await Conversation.find({ user: req.user._id })
    .select("title featureUsed createdAt updatedAt")
    .sort({ updatedAt: -1 }); // Most recent first

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        conversations,
        "Conversations retrieved successfully"
      )
    );
});

/**
 * Get a single conversation with all its messages
 * GET /api/v1/conversations/:conversationId
 */
export const getConversationById = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Validate conversation ID
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  // Find conversation and verify ownership
  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: req.user._id,
  }).populate("documents", "fileName fileType status");

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Get all messages in this conversation
  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: "asc" })
    .select("role content createdAt");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { conversation, messages },
        "Conversation details retrieved successfully"
      )
    );
});

/**
 * Create a new conversation
 * POST /api/v1/conversations
 */
export const createConversation = asyncHandler(async (req, res) => {
  const { title, featureUsed } = req.body;

  // Validate feature mode if provided
  if (featureUsed && !Object.values(FEATURE_MODES).includes(featureUsed)) {
    throw new ApiError(400, `Invalid feature mode. Must be one of: ${Object.values(FEATURE_MODES).join(', ')}`);
  }

  // Create new conversation for the authenticated user
  const conversation = await Conversation.create({
    user: req.user._id,
    title: title || "New Chat",
    featureUsed: featureUsed || FEATURE_MODES.SMART,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, conversation, "Conversation created successfully")
    );
});

/**
 * Send a chat message and get AI response
 * POST /api/v1/conversations/:conversationId/messages
 */
export const sendChatMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  // Validate input
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Message content cannot be empty");
  }

  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  // Find conversation and verify ownership
  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: req.user._id,
  }).populate("documents");

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Save user's message
  const userMessage = await Message.create({
    conversation: conversationId,
    role: "user",
    content: content,
  });

  // Get recent chat history (last 20 messages)
  const chatHistory = await Message.find({ conversation: conversationId })
    .sort({ createdAt: "asc" })
    .select("role content -_id")
    .limit(20);

  // Get vector namespaces from processed documents
  const vectorNamespaces = conversation.documents
    .filter((doc) => doc.status === "processed")
    .map((doc) => doc.vectorNamespace);

  // Call Python AI service for response
  let aiContent;
  try {
    const response = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/query`,
      {
        question: content,
        chatHistory: chatHistory,
        vectorNamespaces: vectorNamespaces,
        featureUsed: conversation.featureUsed,
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

  // Save AI's response
  const assistantMessage = await Message.create({
    conversation: conversationId,
    role: "assistant",
    content: aiContent,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {
          userMessage,
          assistantMessage,
        },
        "Message sent and response received successfully"
      )
    );
});

/**
 * Delete a conversation and all associated data
 * DELETE /api/v1/conversations/:conversationId
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Validate conversation ID
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  // Use transaction to ensure all-or-nothing deletion
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find and delete conversation (verify ownership)
    const conversation = await Conversation.findOneAndDelete({
      _id: conversationId,
      user: req.user._id,
    }).session(session);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation: conversationId }).session(
      session
    );

    // Find all documents to clean up
    const documents = await Document.find({
      conversation: conversationId,
    }).session(session);

    if (documents.length > 0) {
      // Notify Python service to delete vectors (fire-and-forget)
      axios
        .post(`${process.env.PYTHON_SERVICE_URL}/delete-documents`, {
          documents: documents.map((doc) => ({
            filePath: doc.filePath,
            vectorNamespace: doc.vectorNamespace,
          })),
        })
        .catch((err) => {
          console.error(
            "Failed to trigger document cleanup:",
            err.message
          );
        });

      // Delete document records
      await Document.deleteMany({ conversation: conversationId }).session(
        session
      );
    }

    // Commit transaction
    await session.commitTransaction();

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Conversation deleted successfully")
      );
  } catch (error) {
    // Rollback transaction on error (only if not already committed)
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw new ApiError(
      500,
      error?.message || "Failed to delete conversation"
    );
  } finally {
    session.endSession();
  }
});

/**
 * Search conversations by title or message content
 * GET /api/v1/conversations/search?q=query&page=1&limit=20
 */
export const searchConversations = asyncHandler(async (req, res) => {
  const { q: query, page = 1, limit = 20 } = req.query;

  if (!query || query.trim() === "") {
    throw new ApiError(400, "Search query is required");
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Search in conversation titles
  const titleMatches = await Conversation.find({
    user: req.user._id,
    title: { $regex: query, $options: "i" }, // Case-insensitive
  })
    .select("title featureUsed createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Search in message content
  const messageMatches = await Message.find({
    content: { $regex: query, $options: "i" },
  })
    .select("conversation")
    .lean();

  const conversationIdsFromMessages = [
    ...new Set(messageMatches.map((m) => m.conversation.toString())),
  ];

  const conversationsFromMessages = await Conversation.find({
    _id: { $in: conversationIdsFromMessages },
    user: req.user._id,
  })
    .select("title featureUsed createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Combine and deduplicate results
  const allConversations = [...titleMatches, ...conversationsFromMessages];
  const uniqueConversations = Array.from(
    new Map(allConversations.map((c) => [c._id.toString(), c])).values()
  );

  // Sort by updatedAt
  uniqueConversations.sort((a, b) => b.updatedAt - a.updatedAt);

  // Apply limit
  const results = uniqueConversations.slice(0, parseInt(limit));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          conversations: results,
          total: uniqueConversations.length,
          page: parseInt(page),
          limit: parseInt(limit),
        },
        "Search completed successfully"
      )
    );
});

/**
 * Update conversation title or feature mode
 * PATCH /api/v1/conversations/:conversationId
 */
export const updateConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { title, featureUsed } = req.body;

  // Validate input
  if (!title && !featureUsed) {
    throw new ApiError(400, "Title or featureUsed must be provided");
  }

  if (title && title.trim() === "") {
    throw new ApiError(400, "Title cannot be empty");
  }

  // Validate feature mode
  if (featureUsed && !Object.values(FEATURE_MODES).includes(featureUsed)) {
    throw new ApiError(400, `Invalid feature mode. Must be one of: ${Object.values(FEATURE_MODES).join(', ')}`);
  }

  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  // Build update object
  const updateData = {};
  if (title) updateData.title = title.trim();
  if (featureUsed) updateData.featureUsed = featureUsed;

  // Update conversation (verify ownership)
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, user: req.user._id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, conversation, "Conversation updated successfully")
    );
});

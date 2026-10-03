/**
 * Message Controller
 * Handles message edit, delete, and regenerate operations.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Message } from "../models/Message.model.js";
import { Conversation } from "../models/Conversation.model.js";
import mongoose from "mongoose";
import axios from "axios";

const VALID_FEATURE_MODES = new Set([
  'Smart_Chat', 'Document_Analysis', 'Analytical_Insights', 'General_Conversation',
  'executive_summary', 'financial_ratios', 'swot_analysis', 'risk_analysis', 
  'company_comparison', 'multi_document_comparison', 'kpi_extraction', 
  'explain_mode', 'trend_analysis', 'report_generator'
]);
const ENTERPRISE_FEATURE_MODES = new Set([
  'Document_Analysis', 'Analytical_Insights', 'executive_summary', 'financial_ratios', 
  'swot_analysis', 'risk_analysis', 'company_comparison', 'multi_document_comparison', 
  'kpi_extraction', 'explain_mode', 'trend_analysis', 'report_generator'
]);

/** Sanitise feature mode — never store an invalid enum value. */
const sanitiseFeatureMode = (raw) =>
  raw && VALID_FEATURE_MODES.has(raw) ? raw : 'Smart_Chat';

/* ─────────────────────────────────────────────────────────────────── */

/**
 * Update a message (content only, no AI call).
 * PATCH /api/v1/messages/:messageId
 */
export const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Message content cannot be empty");
  }
  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message ID");
  }

  const message = await Message.findById(messageId).populate("conversation");
  if (!message) throw new ApiError(404, "Message not found");

  if (message.conversation.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only edit your own messages");
  }
  if (message.role !== "user") {
    throw new ApiError(403, "You can only edit user messages");
  }

  // Use findByIdAndUpdate to avoid enum validation on untouched fields
  const updated = await Message.findByIdAndUpdate(
    messageId,
    { $set: { content: content.trim() } },
    { new: true, runValidators: false }
  );

  return res.status(200).json(new ApiResponse(200, updated, "Message updated successfully"));
});

/* ─────────────────────────────────────────────────────────────────── */

/**
 * Edit user message and regenerate the AI response.
 * POST /api/v1/messages/:messageId/regenerate
 */
export const editAndRegenerateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  let { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Message content cannot be empty");
  }
  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message ID");
  }

  let message = await Message.findById(messageId).populate({
    path: "conversation",
    populate: { path: "documents" },
  });
  if (!message) throw new ApiError(404, "Message not found");

  if (message.role === "assistant") {
    message = await Message.findOne({
      conversation: message.conversation._id,
      role: "user",
      createdAt: { $lt: message.createdAt }
    }).sort({ createdAt: -1 }).populate({
      path: "conversation",
      populate: { path: "documents" },
    });
    if (!message) throw new ApiError(404, "Preceding user message not found");
    content = message.content;
  }

  if (message.conversation.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only edit your own messages");
  }
  if (message.role !== "user") {
    throw new ApiError(403, "You can only edit user messages");
  }

  const featureMode = sanitiseFeatureMode(message.conversation.featureUsed);
  const isEnterpriseMode = ENTERPRISE_FEATURE_MODES.has(featureMode);

  // ── Step 1: Save the edited content — use update to avoid enum validation ──
  const savedUserMsg = await Message.findByIdAndUpdate(
    message._id,
    { $set: { content: content.trim(), featureUsed: featureMode } },
    { new: true, runValidators: false }
  );

  // ── Step 2: Build chat history (messages BEFORE this one) ──
  const chatHistory = await Message.find({
    conversation: message.conversation._id,
    createdAt: { $lt: message.createdAt },
  })
    .sort({ createdAt: "asc" })
    .select("role content -_id")
    .limit(20);

  const vectorNamespaces = message.conversation.documents
    .filter((d) => d.status === "processed")
    .map((d) => d.vectorNamespace);

  // ── Step 3: Call Python AI service ──
  let aiResponse = null;
  try {
    const response = await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/query`,
      {
        question: content.trim(),
        chatHistory,
        vectorNamespaces,
        featureUsed: featureMode,
      },
      { timeout: 60000 }
    );
    aiResponse = response.data;
  } catch (err) {
    console.error("[regenerate] Python AI call failed:", err.message);
    // User message is already saved — return it with null assistant
    return res.status(200).json(
      new ApiResponse(200, { userMessage: savedUserMsg, assistantMessage: null },
        "Message saved; AI service unavailable")
    );
  }

  const rawAnswer = aiResponse?.answer || '';
  if (!rawAnswer.trim()) {
    return res.status(200).json(
      new ApiResponse(200, { userMessage: savedUserMsg, assistantMessage: null },
        "Message saved; AI returned empty response")
    );
  }

  // ── Step 4: Delete stale messages after the edited one ──
  await Message.deleteMany({
    conversation: message.conversation._id,
    createdAt: { $gt: message.createdAt },
  });

  // ── Step 5: Build message content (full JSON for enterprise modes) ──
  let messageContent;
  if (isEnterpriseMode) {
    messageContent = JSON.stringify({
      answer: rawAnswer,
      analysisType: aiResponse.analysisType || null,
      documents: aiResponse.documents || {},
      insights: aiResponse.insights || [],
      general: aiResponse.general || {},
      visualizations: aiResponse.visualizations || [],
    });
  } else {
    messageContent = rawAnswer;
  }

  // ── Step 6: Persist assistant message ──
  const assistantMessage = await Message.create({
    conversation: message.conversation._id,
    role: "assistant",
    content: messageContent,
    featureUsed: featureMode,
    citations: aiResponse.citations || [],
    documentsData: aiResponse.documents || {},
    insightsData: aiResponse.insights || [],
    generalData: aiResponse.general || {},
    visualizationsData: aiResponse.visualizations || [],
    analysisType: aiResponse.analysisType || null,
  });

  // Bump conversation to top of sidebar
  await Conversation.findByIdAndUpdate(
    message.conversation._id,
    { updatedAt: new Date() },
    { runValidators: false }
  );

  return res.status(200).json(
    new ApiResponse(200, { userMessage: savedUserMsg, assistantMessage },
      "Message updated and response regenerated successfully")
  );
});

/* ─────────────────────────────────────────────────────────────────── */

/**
 * Delete a user message.
 * DELETE /api/v1/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid message ID");
  }

  const message = await Message.findById(messageId).populate("conversation");
  if (!message) throw new ApiError(404, "Message not found");

  if (message.conversation.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }
  if (message.role !== "user") {
    throw new ApiError(403, "You can only delete user messages");
  }

  await message.deleteOne();

  return res.status(200).json(new ApiResponse(200, { deletedIds: [message._id] }, "Message deleted successfully"));
});

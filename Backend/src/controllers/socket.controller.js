/**
 * Socket.IO Controller
 * Handles real-time chat functionality via WebSockets
 */

import { Message } from "../models/Message.model.js";
import { Conversation } from "../models/Conversation.model.js";
import axios from "axios";

const VALID_FEATURE_MODES = new Set([
  'Smart_Chat', 'Document_Analysis', 'Analytical_Insights', 'General_Conversation',
]);
const ENTERPRISE_FEATURE_MODES = new Set(['Document_Analysis', 'Analytical_Insights']);

/** Sanitise feature mode — never store an invalid enum value. */
const sanitiseFeatureMode = (raw) =>
  raw && VALID_FEATURE_MODES.has(raw) ? raw : 'Smart_Chat';

/**
 * Handle new chat message via Socket.IO
 * Provides real-time chat experience
 */
export const handleSocketChatMessage = async (socket, data) => {
  try {
    const { conversationId, content } = data;

    if (!content || content.trim() === "") {
      socket.emit("chatError", { message: "Message content cannot be empty." });
      return;
    }

    // Verify conversation belongs to the socket's authenticated user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      user: socket.user.id,
    }).populate("documents");

    if (!conversation) {
      socket.emit("chatError", { message: "Conversation not found." });
      return;
    }

    const featureMode = sanitiseFeatureMode(conversation.featureUsed);
    const isEnterpriseMode = ENTERPRISE_FEATURE_MODES.has(featureMode);

    // ── Save user message ──────────────────────────────────────────────
    const userMessage = await Message.create({
      conversation: conversationId,
      role: "user",
      content: content.trim(),
      featureUsed: featureMode,
    });

    socket.nsp.to(conversationId).emit("newMessage", userMessage);

    // ── Build context ──────────────────────────────────────────────────
    const chatHistory = await Message.find({ conversation: conversationId })
      .sort({ createdAt: "asc" })
      .select("role content -_id")
      .limit(20);

    const vectorNamespaces = conversation.documents
      .filter((doc) => doc.status === "processed")
      .map((doc) => doc.vectorNamespace);

    // ── Call Python AI service ─────────────────────────────────────────
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

      const aiResponse = response.data;
      const aiCitations = aiResponse.citations || [];
      const aiDocuments = aiResponse.documents || {};
      const aiInsights = Array.isArray(aiResponse.insights) ? aiResponse.insights : [];
      const aiGeneral = aiResponse.general || {};
      const aiVisualizations = aiResponse.visualizations || [];
      const aiAnalysisType = aiResponse.analysisType || null;

      // For enterprise modes store the full structured JSON payload so
      // AnalysisResultView can reconstruct the complete result from content alone.
      // For regular modes store the plain answer string.
      let messageContent;
      if (isEnterpriseMode) {
        messageContent = JSON.stringify({
          answer: aiResponse.answer || '',
          analysisType: aiAnalysisType,
          documents: aiDocuments,
          insights: aiInsights,
          general: aiGeneral,
          visualizations: aiVisualizations,
        });
      } else {
        messageContent = aiResponse.answer || '';
      }

      // ── Persist assistant message ─────────────────────────────────────
      const assistantMessage = await Message.create({
        conversation: conversationId,
        role: "assistant",
        content: messageContent,
        featureUsed: featureMode,
        citations: aiCitations,
        documentsData: aiDocuments,
        insightsData: aiInsights,
        generalData: aiGeneral,
        visualizationsData: aiVisualizations,
        analysisType: aiAnalysisType,
      });

      socket.nsp.to(conversationId).emit("newMessage", assistantMessage);

      // Bump conversation so it floats to top of sidebar
      await Conversation.findByIdAndUpdate(
        conversationId,
        { updatedAt: new Date() },
        { runValidators: false }
      );
      socket.nsp.to(conversationId).emit("conversationUpdated", { conversationId });

    } catch (aiError) {
      console.error("[socket] Python AI service error:", aiError.message);
      socket.emit("chatError", {
        message: "AI service is currently unavailable. Please try again later.",
      });
    }

  } catch (error) {
    console.error("[socket] Chat handler error:", error.message);
    socket.emit("chatError", {
      message: "An error occurred while processing your message.",
    });
  }
};

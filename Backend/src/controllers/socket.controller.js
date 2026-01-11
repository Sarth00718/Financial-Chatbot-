/**
 * Socket.IO Controller
 * Handles real-time chat functionality via WebSockets
 */

import { Message } from "../models/Message.model.js";
import { Conversation } from "../models/Conversation.model.js";
import axios from "axios";

/**
 * Handle new chat message via Socket.IO
 * Provides real-time chat experience
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Object} data - Message data {conversationId, content}
 */
export const handleSocketChatMessage = async (socket, data) => {
  try {
    const { conversationId, content } = data;

    // Validate input
    if (!content || content.trim() === "") {
      socket.emit("chatError", {
        message: "Message content cannot be empty.",
      });
      return;
    }

    // Save user's message
    const userMessage = await Message.create({
      conversation: conversationId,
      role: "user",
      content: content,
    });

    // Emit user message to all clients in the conversation room
    socket.nsp.to(conversationId).emit("newMessage", userMessage);

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId).populate(
      "documents"
    );

    if (!conversation) {
      socket.emit("chatError", {
        message: "Conversation not found.",
      });
      return;
    }

    // Get recent chat history
    const chatHistory = await Message.find({ conversation: conversationId })
      .sort({ createdAt: "asc" })
      .select("role content -_id")
      .limit(20);

    // Get vector namespaces from processed documents
    const vectorNamespaces = conversation.documents
      .filter((doc) => doc.status === "processed")
      .map((doc) => doc.vectorNamespace);

    // Call Python AI service
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

      const aiContent = response.data.answer;

      // Save AI's response
      const assistantMessage = await Message.create({
        conversation: conversationId,
        role: "assistant",
        content: aiContent,
      });

      // Emit AI response to all clients in the conversation room
      socket.nsp.to(conversationId).emit("newMessage", assistantMessage);
    } catch (error) {
      console.error("Error calling Python AI service:", error.message);
      socket.emit("chatError", {
        message: "AI service is currently unavailable. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Socket chat error:", error.message);
    socket.emit("chatError", {
      message: "An error occurred while processing your message.",
    });
  }
};

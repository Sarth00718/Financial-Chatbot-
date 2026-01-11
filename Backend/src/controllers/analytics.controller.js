/**
 * Analytics Controller
 * Handles analytics and statistics
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Conversation } from "../models/Conversation.model.js";
import { Message } from "../models/Message.model.js";
import { Document } from "../models/Document.model.js";

/**
 * Get user analytics and statistics
 * GET /api/v1/analytics/stats
 */
export const getAnalyticsStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get total conversations
  const totalConversations = await Conversation.countDocuments({ userId });

  // Get total messages
  const conversations = await Conversation.find({ userId }).select("_id");
  const conversationIds = conversations.map((c) => c._id);
  const totalMessages = await Message.countDocuments({
    conversation: { $in: conversationIds },
  });

  // Get total documents
  const totalDocuments = await Document.countDocuments({
    conversation: { $in: conversationIds },
  });

  // Get top conversations by message count
  const topConversations = await Message.aggregate([
    { $match: { conversation: { $in: conversationIds } } },
    { $group: { _id: "$conversation", messageCount: { $sum: 1 } } },
    { $sort: { messageCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "conversations",
        localField: "_id",
        foreignField: "_id",
        as: "conversation",
      },
    },
    { $unwind: "$conversation" },
    {
      $project: {
        _id: "$conversation._id",
        title: "$conversation.title",
        messageCount: 1,
      },
    },
  ]);

  // Get messages by time period
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now.setDate(now.getDate() - 7));
  const monthStart = new Date(now.setMonth(now.getMonth() - 1));

  const todayMessages = await Message.countDocuments({
    conversation: { $in: conversationIds },
    createdAt: { $gte: todayStart },
  });

  const weekMessages = await Message.countDocuments({
    conversation: { $in: conversationIds },
    createdAt: { $gte: weekStart },
  });

  const monthMessages = await Message.countDocuments({
    conversation: { $in: conversationIds },
    createdAt: { $gte: monthStart },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalConversations,
        totalMessages,
        totalDocuments,
        topConversations,
        todayMessages,
        weekMessages,
        monthMessages,
        avgResponseTime: "2.3", // Placeholder - can be calculated from actual response times
      },
      "Analytics retrieved successfully"
    )
  );
});

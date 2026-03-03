/**
 * Analytics Controller
 * Provides user and admin analytics data
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";
import { Conversation } from "../models/Conversation.model.js";
import { Message } from "../models/Message.model.js";
import { Document } from "../models/Document.model.js";

/**
 * Get user analytics (personal stats)
 * GET /api/v1/analytics/user
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get total conversations
  const totalConversations = await Conversation.countDocuments({ user: userId });

  // Get total messages sent by user
  const conversations = await Conversation.find({ user: userId }).select("_id");
  const conversationIds = conversations.map((c) => c._id);

  const totalMessages = await Message.countDocuments({
    conversation: { $in: conversationIds },
    role: "user",
  });

  // Get total documents uploaded
  const totalDocuments = await Document.countDocuments({
    conversation: { $in: conversationIds },
  });

  // Get usage over time (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyUsage = await Conversation.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  // Format monthly usage
  const usageOverTime = monthlyUsage.map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
    conversations: item.count,
  }));

  // Get feature usage distribution
  const featureUsage = await Conversation.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: "$featureUsed",
        count: { $sum: 1 },
      },
    },
  ]);

  const analytics = {
    overview: {
      totalConversations,
      totalMessages,
      totalDocuments,
    },
    usageOverTime,
    featureUsage: featureUsage.map((f) => ({
      feature: f._id,
      count: f.count,
    })),
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, analytics, "User analytics retrieved successfully")
    );
});

/**
 * Get admin analytics (system-wide stats)
 * GET /api/v1/analytics/admin
 */
export const getAdminAnalytics = asyncHandler(async (req, res) => {
  // User growth over time (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  // Format user growth
  const userGrowthData = userGrowth.map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
    users: item.count,
  }));

  // Feature usage statistics (all users)
  const featureStats = await Conversation.aggregate([
    {
      $group: {
        _id: "$featureUsed",
        count: { $sum: 1 },
      },
    },
  ]);

  // Document type distribution
  const documentStats = await Document.aggregate([
    {
      $group: {
        _id: "$fileType",
        count: { $sum: 1 },
      },
    },
  ]);

  // Activity over time (conversations per month)
  const activityData = await Conversation.aggregate([
    {
      $match: {
        createdAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        conversations: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  const activityOverTime = activityData.map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
    conversations: item.conversations,
  }));

  const analytics = {
    userGrowth: userGrowthData,
    featureUsage: featureStats.map((f) => ({
      feature: f._id || "Unknown",
      count: f.count,
    })),
    documentTypes: documentStats.map((d) => ({
      type: d._id || "Unknown",
      count: d.count,
    })),
    activityOverTime,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, analytics, "Admin analytics retrieved successfully")
    );
});

/**
 * Export analytics data
 * GET /api/v1/analytics/export?format=csv|json|pdf
 */
export const exportAnalytics = asyncHandler(async (req, res) => {
  const { format = "json" } = req.query;
  const isAdmin = req.user.role === "admin";

  let data;

  if (isAdmin) {
    // Export admin analytics
    const totalUsers = await User.countDocuments();
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();
    const totalDocuments = await Document.countDocuments();

    const featureStats = await Conversation.aggregate([
      {
        $group: {
          _id: "$featureUsed",
          count: { $sum: 1 },
        },
      },
    ]);

    data = {
      exportDate: new Date().toISOString(),
      exportedBy: req.user.email,
      type: "admin",
      statistics: {
        totalUsers,
        totalConversations,
        totalMessages,
        totalDocuments,
        featureUsage: featureStats,
      },
    };
  } else {
    // Export user analytics
    const userId = req.user._id;
    const conversations = await Conversation.find({ user: userId }).select("_id");
    const conversationIds = conversations.map((c) => c._id);

    const totalConversations = conversations.length;
    const totalMessages = await Message.countDocuments({
      conversation: { $in: conversationIds },
      role: "user",
    });
    const totalDocuments = await Document.countDocuments({
      conversation: { $in: conversationIds },
    });

    data = {
      exportDate: new Date().toISOString(),
      exportedBy: req.user.email,
      type: "user",
      statistics: {
        totalConversations,
        totalMessages,
        totalDocuments,
      },
    };
  }

  // Handle different formats
  if (format === "csv") {
    // Convert to CSV
    const csvRows = [];
    csvRows.push("Metric,Value");
    
    Object.entries(data.statistics).forEach(([key, value]) => {
      if (typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          csvRows.push(`${key}.${subKey},${subValue}`);
        });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          csvRows.push(`${key}[${index}],${JSON.stringify(item)}`);
        });
      } else {
        csvRows.push(`${key},${value}`);
      }
    });

    const csv = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analytics-${Date.now()}.csv"`
    );
    return res.send(csv);
  }

  // Default: JSON
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="analytics-${Date.now()}.json"`
  );
  return res.json(data);
});

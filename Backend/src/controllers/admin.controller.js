/**
 * Admin Controller
 * Handles admin operations: user management, statistics, and system monitoring
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";
import { Conversation } from "../models/Conversation.model.js";
import { Message } from "../models/Message.model.js";
import { Document } from "../models/Document.model.js";
import mongoose from "mongoose";

/**
 * Get all users with pagination and filters
 * GET /api/v1/admin/users
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    role = "",
    isActive = "",
  } = req.query;

  // Build filter query
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  if (isActive !== "") {
    filter.isActive = isActive === "true";
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get users
  const users = await User.find(filter)
    .select("-password -refreshToken -resetPasswordToken -emailVerificationToken")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await User.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Users retrieved successfully"
    )
  );
});

/**
 * Get single user details with statistics
 * GET /api/v1/admin/users/:userId
 */
export const getUserDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Get user
  const user = await User.findById(userId).select(
    "-password -refreshToken -resetPasswordToken -emailVerificationToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get user statistics
  const conversationCount = await Conversation.countDocuments({ user: userId });
  const messageCount = await Message.countDocuments({
    conversation: { $in: await Conversation.find({ user: userId }).distinct("_id") },
  });
  const documentCount = await Document.countDocuments({
    conversation: { $in: await Conversation.find({ user: userId }).distinct("_id") },
  });

  // Get recent activity
  const recentConversations = await Conversation.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("title featureUsed updatedAt");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        statistics: {
          conversations: conversationCount,
          messages: messageCount,
          documents: documentCount,
        },
        recentActivity: recentConversations,
      },
      "User details retrieved successfully"
    )
  );
});

/**
 * Update user role
 * PATCH /api/v1/admin/users/:userId/role
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  if (!["user", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role. Must be 'user' or 'admin'");
  }

  // Prevent self-demotion
  if (userId === req.user._id.toString() && role === "user") {
    throw new ApiError(400, "You cannot demote yourself");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "User role updated successfully")
  );
});

/**
 * Block/Unblock user
 * PATCH /api/v1/admin/users/:userId/status
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean");
  }

  // Prevent self-blocking
  if (userId === req.user._id.toString() && !isActive) {
    throw new ApiError(400, "You cannot block yourself");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // If blocking user, clear their refresh token
  if (!isActive) {
    user.refreshToken = undefined;
    await user.save();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      user,
      `User ${isActive ? "activated" : "blocked"} successfully`
    )
  );
});

/**
 * Delete user and all associated data
 * DELETE /api/v1/admin/users/:userId
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Prevent self-deletion
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot delete yourself");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find user
    const user = await User.findById(userId).session(session);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Get all user's conversations
    const conversations = await Conversation.find({ user: userId }).session(session);
    const conversationIds = conversations.map((c) => c._id);

    // Delete all messages
    await Message.deleteMany({ conversation: { $in: conversationIds } }).session(session);

    // Delete all documents
    await Document.deleteMany({ conversation: { $in: conversationIds } }).session(session);

    // Delete all conversations
    await Conversation.deleteMany({ user: userId }).session(session);

    // Delete user
    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();

    return res.status(200).json(
      new ApiResponse(200, {}, "User and all associated data deleted successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Get dashboard statistics
 * GET /api/v1/admin/statistics
 */
export const getDashboardStatistics = asyncHandler(async (req, res) => {
  // Get counts
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const adminUsers = await User.countDocuments({ role: "admin" });
  const totalConversations = await Conversation.countDocuments();
  const totalMessages = await Message.countDocuments();
  const totalDocuments = await Document.countDocuments();

  // Get recent registrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  // Get active users (logged in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeUsersLastWeek = await User.countDocuments({
    lastLogin: { $gte: sevenDaysAgo },
  });

  // Get feature usage statistics
  const featureUsage = await Conversation.aggregate([
    {
      $group: {
        _id: "$featureUsed",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Get document processing statistics
  const documentStats = await Document.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Get user growth (last 12 months)
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

  // Get top users by activity
  const topUsers = await Conversation.aggregate([
    {
      $group: {
        _id: "$user",
        conversationCount: { $sum: 1 },
      },
    },
    {
      $sort: { conversationCount: -1 },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    {
      $unwind: "$userDetails",
    },
    {
      $project: {
        _id: 1,
        conversationCount: 1,
        name: "$userDetails.name",
        email: "$userDetails.email",
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: {
          totalUsers,
          activeUsers,
          adminUsers,
          totalConversations,
          totalMessages,
          totalDocuments,
          recentRegistrations,
          activeUsersLastWeek,
        },
        featureUsage,
        documentStats,
        userGrowth,
        topUsers,
      },
      "Dashboard statistics retrieved successfully"
    )
  );
});

/**
 * Get system logs (recent activities)
 * GET /api/v1/admin/logs
 */
export const getSystemLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get recent conversations as activity logs
  const recentActivities = await Conversation.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select("title featureUsed createdAt updatedAt user");

  const total = await Conversation.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        activities: recentActivities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      "System logs retrieved successfully"
    )
  );
});

/**
 * Get system health status
 * GET /api/v1/admin/health
 */
export const getSystemHealth = asyncHandler(async (req, res) => {
  // Check database connection
  const dbStatus = ion.readyState === 1 ? "connected" : "disconnected";

  // Get memory usage
  const memoryUsage = process.memoryUsage();

  // Get uptime
  const uptime = process.uptime();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "healthy",
        database: dbStatus,
        uptime: Math.floor(uptime),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
        },
        timestamp: new Date().toISOString(),
      },
      "System health retrieved successfully"
    )
  );
});

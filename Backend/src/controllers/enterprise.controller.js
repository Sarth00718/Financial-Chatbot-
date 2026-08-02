/**
 * Enterprise Controller
 * Proxies enterprise AI analysis to Python service and manages watchlists/bookmarks
 */

import axios from "axios";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Conversation } from "../models/Conversation.model.js";
import { Document } from "../models/Document.model.js";
import { Watchlist } from "../models/Watchlist.model.js";
import { Bookmark } from "../models/Bookmark.model.js";

const getPythonUrl = () => {
  const url = process.env.PYTHON_SERVICE_URL;
  if (!url) {
    throw new ApiError(500, 'Missing PYTHON_SERVICE_URL configuration');
  }
  return url;
};

const VALID_ANALYSIS_TYPES = [
  "executive_summary",
  "financial_ratios",
  "swot_analysis",
  "risk_analysis",
  "company_comparison",
  "multi_document_comparison",
  "kpi_extraction",
  "explain_mode",
  "trend_analysis",
  "report_generator",
];

/**
 * Resolve vector namespaces from conversation or explicit document IDs
 */
async function resolveNamespaces(userId, { conversationId, documentIds }) {
  if (documentIds?.length) {
    const docs = await Document.find({ _id: { $in: documentIds } }).populate({
      path: "conversation",
      select: "user",
    });

    const owned = docs.filter(
      (d) => d.conversation?.user?.toString() === userId.toString() && d.status === "processed"
    );

    if (!owned.length) {
      throw new ApiError(404, "No processed documents found");
    }

    return owned.map((d) => d.vectorNamespace);
  }

  if (!conversationId || !mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "conversationId or documentIds required");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    user: userId,
  }).populate("documents");

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const namespaces = conversation.documents
    .filter((doc) => doc.status === "processed")
    .map((doc) => doc.vectorNamespace);

  if (!namespaces.length) {
    throw new ApiError(400, "No processed documents in this conversation");
  }

  return namespaces;
}

/**
 * POST /api/v1/enterprise/analyze
 */
export const runEnterpriseAnalysis = asyncHandler(async (req, res) => {
  const { analysisType, conversationId, documentIds, question } = req.body;

  if (!analysisType || !VALID_ANALYSIS_TYPES.includes(analysisType)) {
    throw new ApiError(
      400,
      `Invalid analysisType. Must be one of: ${VALID_ANALYSIS_TYPES.join(", ")}`
    );
  }

  const vectorNamespaces = await resolveNamespaces(req.user._id, {
    conversationId,
    documentIds,
  });

  try {
    const response = await axios.post(
      `${getPythonUrl()}/enterprise/analyze`,
      {
        analysisType,
        vectorNamespaces,
        question: question || "",
        chatHistory: [],
      },
      { timeout: 60000 }
    );

    return res.status(200).json(
      new ApiResponse(200, response.data, "Enterprise analysis completed")
    );
  } catch (error) {
    logger.error("Enterprise analysis error:", error.message);
    throw new ApiError(502, "Enterprise AI service unavailable");
  }
});

/**
 * GET /api/v1/enterprise/analysis-types
 */
export const getAnalysisTypes = asyncHandler(async (req, res) => {
  try {
    const response = await axios.get(`${getPythonUrl()}/enterprise/analysis-types`, {
      timeout: 10000,
    });
    return res.status(200).json(
      new ApiResponse(200, response.data, "Analysis types retrieved")
    );
  } catch {
    return res.status(200).json(
      new ApiResponse(200, {
        analysisTypes: VALID_ANALYSIS_TYPES,
        descriptions: {},
      }, "Analysis types retrieved (fallback)")
    );
  }
});

export const getEnterpriseCharts = asyncHandler(async (req, res) => {
  const { analysisType, conversationId, documentIds, question } = req.body;

  if (!analysisType || !VALID_ANALYSIS_TYPES.includes(analysisType)) {
    throw new ApiError(
      400,
      `Invalid analysisType. Must be one of: ${VALID_ANALYSIS_TYPES.join(", ")}`
    );
  }

  const vectorNamespaces = await resolveNamespaces(req.user._id, {
    conversationId,
    documentIds,
  });

  try {
    const response = await axios.post(
      `${getPythonUrl()}/enterprise/charts`,
      {
        analysisType,
        vectorNamespaces,
        question: question || "",
        chatHistory: [],
      },
      { timeout: 60000 }
    );

    return res.status(200).json(
      new ApiResponse(200, response.data, "Enterprise charts retrieved")
    );
  } catch (error) {
    logger.error("Enterprise chart extraction error:", error.message);
    throw new ApiError(502, "Enterprise AI service unavailable");
  }
});

/**
 * POST /api/v1/enterprise/audit-summary
 */
export const getAuditSummary = asyncHandler(async (req, res) => {
  const { conversationId, documentIds } = req.body;
  const vectorNamespaces = await resolveNamespaces(req.user._id, {
    conversationId,
    documentIds,
  });

  try {
    const response = await axios.post(
      `${getPythonUrl()}/audit-summary`,
      { vectorNamespaces },
      { timeout: 60000 }
    );
    return res.status(200).json(
      new ApiResponse(200, response.data, "Audit summary retrieved")
    );
  } catch (error) {
    logger.error("Audit summary error:", error.message);
    throw new ApiError(502, "Audit summary service unavailable");
  }
});

// ── Watchlist CRUD ──────────────────────────────────────────────

export const getWatchlist = asyncHandler(async (req, res) => {
  const items = await Watchlist.find({ user: req.user._id, isActive: true })
    .populate("conversation", "title")
    .populate("document", "fileName fileType status")
    .sort({ updatedAt: -1 });

  return res.status(200).json(new ApiResponse(200, items, "Watchlist retrieved"));
});

export const addToWatchlist = asyncHandler(async (req, res) => {
  const { name, company, conversationId, documentId, notes, tags } = req.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Name is required");
  }

  const item = await Watchlist.create({
    user: req.user._id,
    name: name.trim(),
    company: company?.trim() || "",
    conversation: conversationId || undefined,
    document: documentId || undefined,
    notes: notes || "",
    tags: tags || [],
  });

  return res.status(201).json(new ApiResponse(201, item, "Added to watchlist"));
});

export const removeFromWatchlist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid watchlist ID");
  }

  const item = await Watchlist.findOneAndDelete({ _id: id, user: req.user._id });

  if (!item) {
    throw new ApiError(404, "Watchlist item not found");
  }

  return res.status(200).json(new ApiResponse(200, {}, "Removed from watchlist"));
});

// ── Bookmark CRUD ───────────────────────────────────────────────

export const getBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ user: req.user._id })
    .populate("conversation", "title")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, bookmarks, "Bookmarks retrieved"));
});

export const createBookmark = asyncHandler(async (req, res) => {
  const { title, content, conversationId, messageId, analysisType, tags } = req.body;

  if (!title?.trim() || !content?.trim()) {
    throw new ApiError(400, "Title and content are required");
  }

  const bookmark = await Bookmark.create({
    user: req.user._id,
    title: title.trim(),
    content: content.trim(),
    conversation: conversationId || undefined,
    message: messageId || undefined,
    analysisType: analysisType || "",
    tags: tags || [],
  });

  return res.status(201).json(new ApiResponse(201, bookmark, "Bookmark created"));
});

export const deleteBookmark = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid bookmark ID");
  }

  const bookmark = await Bookmark.findOneAndDelete({ _id: id, user: req.user._id });

  if (!bookmark) {
    throw new ApiError(404, "Bookmark not found");
  }

  return res.status(200).json(new ApiResponse(200, {}, "Bookmark deleted"));
});

/**
 * GET /api/v1/enterprise/search
 * Advanced search across conversations and bookmarks
 */
export const advancedSearch = asyncHandler(async (req, res) => {
  const { q, type = "all" } = req.query;

  if (!q?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const results = { conversations: [], bookmarks: [] };

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (type === "all" || type === "conversations") {
    results.conversations = await Conversation.find({
      user: req.user._id,
      title: { $regex: escapedQ, $options: "i" },
    })
      .select("title featureUsed updatedAt")
      .sort({ updatedAt: -1 })
      .limit(20);
  }

  if (type === "all" || type === "bookmarks") {
    results.bookmarks = await Bookmark.find({
      user: req.user._id,
      $or: [
        { title: { $regex: escapedQ, $options: "i" } },
        { content: { $regex: escapedQ, $options: "i" } },
        { tags: { $regex: escapedQ, $options: "i" } },
      ],
    })
      .select("title analysisType tags createdAt")
      .sort({ createdAt: -1 })
      .limit(20);
  }

  return res.status(200).json(new ApiResponse(200, results, "Search completed"));
});

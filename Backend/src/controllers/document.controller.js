/**
 * Document Controller
 * Handles document upload and processing
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Document } from "../models/Document.model.js";
import { Conversation } from "../models/Conversation.model.js";
import { Message } from "../models/Message.model.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import mongoose from "mongoose";

/**
 * Upload documents to a conversation
 * POST /api/v1/documents/upload
 */
export const uploadDocuments = asyncHandler(async (req, res) => {
  const { conversationId } = req.body;
  const files = req.files;

  // Validate input
  if (!files || files.length === 0) {
    throw new ApiError(400, "No files uploaded");
  }

  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  // Verify conversation exists
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Process each uploaded file
  const uploadedDocuments = [];

  for (const file of files) {
    // Create document record
    const document = await Document.create({
      conversation: conversationId,
      fileName: file.originalname,
      filePath: file.path, // Store full path for Python service access
      fileType: file.mimetype,
      status: "processing",
      vectorNamespace: `doc-${uuidv4()}`, // Unique namespace for vector storage
    });

    // Create system message to notify user
    await Message.create({
      conversation: conversationId,
      role: "system",
      content: `File uploaded: ${document.fileName}. Processing...`,
    });

    // Trigger Python service to process document (fire-and-forget)
    axios
      .post(`${process.env.PYTHON_SERVICE_URL}/process-document`, {
        documentId: document._id.toString(),
        filePath: file.path, // Full path for Python service
        fileName: file.originalname,
        vectorNamespace: document.vectorNamespace,
      })
      .catch((err) => {
        console.error(
          `Failed to trigger processing for document ${document._id}:`,
          err.message
        );
      });

    uploadedDocuments.push(document);
  }

  // Add document references to conversation
  const documentIds = uploadedDocuments.map((doc) => doc._id);
  await Conversation.findByIdAndUpdate(conversationId, {
    $push: { documents: { $each: documentIds } },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        uploadedDocuments,
        `${files.length} file(s) uploaded successfully. Processing started.`
      )
    );
});

/**
 * Webhook endpoint for Python service to update document status
 * PATCH /api/v1/documents/:documentId/status
 */
export const updateDocumentStatus = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { status, errorMessage } = req.body;

  // Validate status
  if (!["processed", "failed"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'processed' or 'failed'");
  }

  // Update document status
  const document = await Document.findByIdAndUpdate(
    documentId,
    {
      $set: {
        status: status,
        errorMessage: errorMessage || null,
      },
    },
    { new: true }
  );

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  // Create system message to notify user
  const messageContent =
    status === "processed"
      ? `File processed successfully: ${document.fileName}`
      : `Failed to process file: ${document.fileName}. ${errorMessage || ""}`;

  await Message.create({
    conversation: document.conversation,
    role: "system",
    content: messageContent,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, document, "Document status updated successfully")
    );
});

/**
 * Get all documents in a conversation
 * GET /api/v1/documents/conversation/:conversationId
 */
export const getConversationDocuments = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Validate conversation ID
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation ID");
  }

  // Verify conversation exists
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Get all documents
  const documents = await Document.find({ conversation: conversationId })
    .select("fileName fileType status errorMessage createdAt")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, documents, "Documents retrieved successfully")
    );
});

/**
 * Delete a document
 * DELETE /api/v1/documents/:documentId
 */
export const deleteDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  // Validate document ID
  if (!mongoose.isValidObjectId(documentId)) {
    throw new ApiError(400, "Invalid document ID");
  }

  // Find document
  const document = await Document.findById(documentId);

  if (!document) {
    throw new ApiError(404, "Document not found");
  }

  // Notify Python service to delete vectors (fire-and-forget)
  axios
    .post(`${process.env.PYTHON_SERVICE_URL}/delete-document`, {
      filePath: document.filePath,
      vectorNamespace: document.vectorNamespace,
    })
    .catch((err) => {
      console.error("Failed to trigger document cleanup:", err.message);
    });

  // Delete document record
  await Document.findByIdAndDelete(documentId);

  // Remove document reference from conversation
  await Conversation.findByIdAndUpdate(document.conversation, {
    $pull: { documents: documentId },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Document deleted successfully"));
});

/**
 * Document Model
 * Represents uploaded documents (PDFs, Excel files, etc.)
 */

import mongoose from "mongoose";
import { DOCUMENT_STATUS } from "../config/constants.js";

const documentSchema = new mongoose.Schema(
  {
    // Reference to the conversation this document belongs to
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    // Original filename
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    // Local file path (replaces S3 URL)
    filePath: {
      type: String,
      required: true,
    },
    // MIME type of the file
    fileType: {
      type: String,
      required: true,
    },
    // Processing status
    status: {
      type: String,
      required: true,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.UPLOADING,
    },
    // Error message if processing failed
    errorMessage: {
      type: String,
      trim: true,
    },
    // Unique namespace for vector storage (used by Python backend)
    vectorNamespace: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt
);

export const Document = mongoose.model("Document", documentSchema);

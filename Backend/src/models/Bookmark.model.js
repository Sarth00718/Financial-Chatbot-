/**
 * Bookmark Model
 * Saves important messages, analyses, or insights for quick access
 */

import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    analysisType: {
      type: String,
      default: "",
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, createdAt: -1 });

export const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

/**
 * Watchlist Model
 * Tracks companies/documents a user is monitoring
 */

import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    notes: {
      type: String,
      default: "",
    },
    tags: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

watchlistSchema.index({ user: 1, name: 1 });

export const Watchlist = mongoose.model("Watchlist", watchlistSchema);

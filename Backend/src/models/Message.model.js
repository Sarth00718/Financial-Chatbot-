/**
 * Message Model
 * Represents individual messages in a conversation
 */

import mongoose from "mongoose";
import { MESSAGE_ROLES } from "../config/constants.js";

const messageSchema = new mongoose.Schema(
  {
    // Reference to the conversation this message belongs to
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    // Role of the message sender (user, assistant, or system)
    role: {
      type: String,
      required: true,
      enum: Object.values(MESSAGE_ROLES),
    },
    // Content of the message
    content: {
      type: String,
      required: true,
    },
    // Optional: Documents referenced in this message
    sourceDocuments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
  },
  { timestamps: true } // Automatically add createdAt and updatedAt
);

export const Message = mongoose.model("Message", messageSchema);

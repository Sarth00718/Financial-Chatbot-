/**
 * Server Entry Point
 * Starts the Express server with Socket.IO support
 */

import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { app } from "./app.js";
import connectDatabase from "./config/database.js";
import { handleSocketChatMessage } from "./controllers/socket.controller.js";
import { ensureUploadsDirectory } from "./utils/fileStorage.js";

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

/**
 * Create HTTP server
 */
const httpServer = http.createServer(app);

/**
 * Configure Socket.IO
 * Enables real-time bidirectional communication
 */
const io = new Server(httpServer, {
  pingTimeout: 60000, // 60 seconds
  cors: {
    origin: CORS_ORIGIN.split(","), // Support multiple origins
    credentials: true,
  },
});

// Make io accessible in Express routes
app.set("io", io);

/**
 * Socket.IO Connection Handler
 * No authentication required - simplified version
 */
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  /**
   * Join Conversation Room
   * Allows user to receive real-time updates for a specific conversation
   */
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`📥 User joined conversation ${conversationId}`);
  });

  /**
   * Leave Conversation Room
   */
  socket.on("leaveConversation", (conversationId) => {
    socket.leave(conversationId);
    console.log(`📤 User left conversation ${conversationId}`);
  });

  /**
   * Send Message
   * Handle incoming chat messages
   */
  socket.on("sendMessage", (data) => {
    handleSocketChatMessage(socket, data);
  });

  /**
   * Disconnect Handler
   */
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

/**
 * Start Server
 * Connect to database and start listening for requests
 */
const startServer = async () => {
  try {
    // Ensure uploads directory exists
    ensureUploadsDirectory();

    // Connect to MongoDB
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log("\n" + "=".repeat(50));
      console.log("🚀 FinChatBot Backend Server Started");
      console.log("=".repeat(50));
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO: Enabled`);
      console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);
      console.log(`📁 Uploads Directory: ./uploads`);
      console.log("=".repeat(50) + "\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

/**
 * Graceful Shutdown
 * Handle process termination signals
 */
process.on("SIGTERM", () => {
  console.log("\n⚠️  SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n⚠️  SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

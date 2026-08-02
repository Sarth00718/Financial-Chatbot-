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
import { verifyAccessToken } from "./utils/jwt.js";
import { User } from "./models/User.model.js";
import logger from "./utils/logger.js";

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";

/**
 * Create HTTP server
 */
const httpServer = http.createServer(app);

/**
 * Configure Socket.IO
 * Enables real-time bidirectional communication
 */
const allowedSocketOrigins = CORS_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// In development always allow localhost origins; never fall back to true (allow all)
const devOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const socketOrigins = allowedSocketOrigins.length > 0
  ? allowedSocketOrigins
  : (process.env.NODE_ENV === "development" ? devOrigins : []);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: socketOrigins.length > 0 ? socketOrigins : false,
    credentials: true,
  },
});

// Make io accessible in Express routes
app.set("io", io);

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .map(([name, ...value]) => [name, decodeURIComponent(value.join("="))])
  );

/**
 * Socket.IO Authentication Middleware
 * Verifies access token from cookies or Authorization header
 */
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1] ||
      parseCookies(socket.handshake.headers?.cookie || "").accessToken;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    if (!user.isActive) {
      return next(new Error("User account is deactivated"));
    }

    socket.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    logger.error("Socket auth failed:", err.message);
    next(new Error("Socket authentication failed"));
  }
});

/**
 * Socket.IO Connection Handler
 */
io.on("connection", (socket) => {
  logger.info(`✅ User connected: ${socket.id} (${socket.user?.email || 'unknown'})`);

  /**
   * Join Conversation Room
   * Allows user to receive real-time updates for a specific conversation
   */
  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    logger.info(`📥 User joined conversation ${conversationId}`);
  });

  /**
   * Leave Conversation Room
   */
  socket.on("leaveConversation", (conversationId) => {
    socket.leave(conversationId);
    logger.info(`📤 User left conversation ${conversationId}`);
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
    logger.info(`❌ User disconnected: ${socket.id}`);
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
      logger.info("\n" + "=".repeat(50));
      logger.info("🚀 FinChatBot Backend Server Started");
      logger.info("=".repeat(50));
      logger.info(`📍 Server URL: http://localhost:${PORT}`);
      logger.info(`🔌 Socket.IO: Enabled`);
      logger.info(`🌐 CORS Origin: ${CORS_ORIGIN || 'not configured (allows all origins)'}`);
      logger.info(`📁 Uploads Directory: ./uploads`);
      logger.info("=".repeat(50) + "\n");
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error.message);
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
  logger.info("\n⚠️  SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    logger.info("✅ HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("\n⚠️  SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    logger.info("✅ HTTP server closed");
    process.exit(0);
  });
});

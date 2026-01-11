/**
 * Express Application Setup
 * Configures middleware and routes
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import documentRoutes from "./routes/document.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";

// Get directory path (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

/**
 * CORS Configuration
 * Allows frontend to communicate with backend
 */
const allowedOrigins = [
  "http://localhost:5173",  // Vite default dev server
  "http://localhost:3000",  // Alternative frontend port
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin"));
      }
    },
    credentials: true, // Allow cookies
  })
);

/**
 * Body Parser Middleware
 * Parse JSON and URL-encoded request bodies
 */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/**
 * Static Files Middleware
 * Serve uploaded files
 */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/**
 * API Routes
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

/**
 * Health Check Endpoint
 * Used to verify server is running
 */
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "FinChatBot API is running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Root Endpoint
 */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to FinChatBot API",
    version: "2.0.0",
    documentation: "/api/v1/health",
  });
});

/**
 * 404 Handler
 * Catch all undefined routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/**
 * Global Error Handler
 * Must be defined last
 */
app.use(errorHandler);

export { app };

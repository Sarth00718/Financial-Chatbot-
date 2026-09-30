/**
 * Express Application Setup
 * Configures middleware and routes
 */

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import { requestLogger } from "./middlewares/requestLogger.middleware.js";
import { apiLimiter } from "./middlewares/rateLimiter.middleware.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import documentRoutes from "./routes/document.routes.js";
import messageRoutes from "./routes/message.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import enterpriseRoutes from "./routes/enterprise.routes.js";

dotenv.config();

// Get directory path (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

/**
 * Security Middleware
 * Helmet helps secure Express apps by setting various HTTP headers
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

/**
 * Trust proxy when running behind a proxy or load balancer
 */
app.set("trust proxy", 1);

/**
 * Cookie Parser Middleware
 * Parse cookies from requests
 */
app.use(cookieParser());

/**
 * CORS Configuration
 * Allows frontend to communicate with backend
 */
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const allowedCorsOrigins = Array.from(
  new Set([
    ...allowedOrigins,
    ...(process.env.NODE_ENV !== "production" ? defaultDevOrigins : []),
  ])
);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile clients, same-origin Vite proxy)
      if (!origin) return callback(null, true);

      // If no origins configured at all, allow in development, block in production
      if (allowedCorsOrigins.length === 0) {
        if (process.env.NODE_ENV !== "production") return callback(null, true);
        return callback(new Error("CORS not configured — request blocked"));
      }

      const normalizedOrigin = origin.trim();
      const isAllowed = allowedCorsOrigins.includes("*") || allowedCorsOrigins.some(
        (allowedOrigin) => allowedOrigin.toLowerCase() === normalizedOrigin.toLowerCase()
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${normalizedOrigin}`));
      }
    },
    credentials: true,
    exposedHeaders: ["Set-Cookie"],
  })
);

/**
 * Global API rate limiter
 */
app.use(apiLimiter);

/**
 * Body Parser Middleware
 * Parse JSON and URL-encoded request bodies
 */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/**
 * Request Logger Middleware
 * Log all incoming requests
 */
if (process.env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

/**
 * Static Files Middleware
 * Serve uploaded files
 */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/**
 * API Routes
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/enterprise", enterpriseRoutes);

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
    version: "3.0.0",
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

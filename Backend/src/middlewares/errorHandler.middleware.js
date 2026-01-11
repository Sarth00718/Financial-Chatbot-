/**
 * Global Error Handler Middleware
 * Catches all errors and sends consistent error responses
 */

/**
 * Global error handling middleware
 * Must be defined after all routes
 */
export const errorHandler = (err, _req, res, _next) => {
  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // Handle specific error types
  
  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate Entry";
    const field = Object.keys(err.keyPattern)[0];
    errors = [`${field} already exists`];
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Multer file upload errors
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size too large (max 50MB)";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files (max 10)";
    } else {
      message = "File upload error";
    }
  }

  // Log error for debugging (in development)
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error:", err);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

/**
 * Request Logger Middleware
 * Logs all incoming requests
 */

import logger from "../services/logger.service.js";

/**
 * Log incoming requests
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log when response is finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?._id,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error("Request failed", logData);
    } else if (res.statusCode >= 400) {
      logger.warn("Request error", logData);
    } else {
      logger.info("Request completed", logData);
    }
  });

  next();
};

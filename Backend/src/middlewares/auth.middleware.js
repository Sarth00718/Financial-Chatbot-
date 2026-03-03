/**
 * Authentication Middleware
 * Protects routes and verifies user identity
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, setTokenCookie } from "../utils/jwt.js";

/**
 * Verify JWT and attach user to request
 * Supports both cookie and Authorization header
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookies (preferred)
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  // Check for token in Authorization header (fallback)
  else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Authentication required. Please login.");
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);

    // Find user
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      throw new ApiError(401, "User not found. Please login again.");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Your account has been deactivated. Contact support.");
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // If access token expired, try to refresh
    if (error.message.includes("expired") && req.cookies?.refreshToken) {
      try {
        const refreshToken = req.cookies.refreshToken;
        const decoded = verifyRefreshToken(refreshToken);

        // Find user
        const user = await User.findById(decoded.userId).select("+refreshToken");

        if (!user || user.refreshToken !== refreshToken) {
          throw new ApiError(401, "Invalid refresh token. Please login again.");
        }

        if (!user.isActive) {
          throw new ApiError(403, "Your account has been deactivated.");
        }

        // Generate new access token
        const newAccessToken = generateAccessToken({ userId: user._id, role: user.role });
        setTokenCookie(res, "accessToken", newAccessToken, 15 * 60 * 1000); // 15 minutes

        // Attach user to request
        req.user = user;
        return next();
      } catch (refreshError) {
        throw new ApiError(401, "Session expired. Please login again.");
      }
    }

    throw new ApiError(401, error.message || "Invalid authentication token");
  }
});

/**
 * Authorize based on user roles
 * @param  {...String} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role: ${roles.join(" or ")}`
      );
    }

    next();
  };
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select("-password");
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

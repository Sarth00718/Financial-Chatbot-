/**
 * Authentication Controller
 * Handles user registration, login, logout, and password management
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/User.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookie,
  clearAuthCookies,
  verifyRefreshToken,
} from "../utils/jwt.js";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../services/email.service.js";

/**
 * Register new user
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: "user",
  });

  // Send welcome email (fire-and-forget)
  sendWelcomeEmail(email, name).catch((err) =>
    console.error("Failed to send welcome email:", err)
  );

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    userId: user._id,
    role: user.role,
  });

  // Save refresh token to database
  user.refreshToken = refreshToken;
  await user.save();

  // Set HTTP-only cookies
  setTokenCookie(res, "accessToken", accessToken, 15 * 60 * 1000); // 15 minutes
  setTokenCookie(res, "refreshToken", refreshToken, 7 * 24 * 60 * 60 * 1000); // 7 days

  // Return user data (without password)
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  return res.status(201).json(
    new ApiResponse(201, userData, "Registration successful")
  );
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated. Contact support.");
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Update last login
  user.lastLogin = new Date();

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    userId: user._id,
    role: user.role,
  });

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Set HTTP-only cookies
  setTokenCookie(res, "accessToken", accessToken, 15 * 60 * 1000); // 15 minutes
  setTokenCookie(res, "refreshToken", refreshToken, 7 * 24 * 60 * 60 * 1000); // 7 days

  // Return user data
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
  };

  return res.status(200).json(
    new ApiResponse(200, userData, "Login successful")
  );
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshToken: 1 },
    });
  }

  // Clear cookies
  clearAuthCookies(res);

  return res.status(200).json(
    new ApiResponse(200, {}, "Logout successful")
  );
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, user, "Profile retrieved successfully")
  );
});

/**
 * Update user profile
 * PATCH /api/v1/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  // Check if email is being changed and already exists
  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, "Email already in use");
    }
  }

  // Update user
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        ...(name && { name }),
        ...(email && { email, isEmailVerified: false }),
      },
    },
    { new: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, user, "Profile updated successfully")
  );
});

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully")
  );
});

/**
 * Forgot password - Send reset email
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "If an account exists, a password reset email has been sent"
      )
    );
  }

  // Generate reset token
  const resetToken = user.generateResetToken();
  await user.save({ validateBeforeSave: false });

  // Send reset email
  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    return res.status(200).json(
      new ApiResponse(
        200,
        {},
        "Password reset email sent successfully"
      )
    );
  } catch (error) {
    // Clear reset token if email fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(500, "Failed to send password reset email");
  }
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Find user with valid reset token
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpire");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Update password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset successful")
  );
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Account deactivated");
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });

    // Set new access token cookie
    setTokenCookie(res, "accessToken", newAccessToken, 15 * 60 * 1000);

    return res.status(200).json(
      new ApiResponse(200, {}, "Access token refreshed successfully")
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

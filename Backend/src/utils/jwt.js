/**
 * JWT Utility Functions
 * Handles token generation and verification
 */

import jwt from "jsonwebtoken";

/**
 * Generate Access Token (short-lived)
 * @param {Object} payload - User data to encode
 * @returns {String} JWT token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });
};

/**
 * Generate Refresh Token (long-lived)
 * @param {Object} payload - User data to encode
 * @returns {String} JWT token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });
};

/**
 * Verify Access Token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
};

/**
 * Verify Refresh Token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
};

/**
 * Set HTTP-only cookie with token
 * @param {Object} res - Express response object
 * @param {String} name - Cookie name
 * @param {String} token - Token value
 * @param {Number} maxAge - Cookie expiration in milliseconds
 */
export const setTokenCookie = (res, name, token, maxAge) => {
  res.cookie(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: maxAge,
  });
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
};

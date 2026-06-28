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
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax");
  const secure = process.env.COOKIE_SECURE === "true" || isProduction;
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    maxAge,
    path: "/",
  };

  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.cookie(name, token, cookieOptions);
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE || "none";
  const secure = process.env.COOKIE_SECURE === "true" || isProduction;
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};

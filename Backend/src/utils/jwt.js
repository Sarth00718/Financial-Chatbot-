/**
 * JWT Utility Functions
 * Handles token generation and verification
 */

import jwt from "jsonwebtoken";

/**
 * Generate Access Token (short-lived)
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });
};

/**
 * Generate Refresh Token (long-lived)
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });
};

/**
 * Verify Access Token
 * Preserves the original JWT error (TokenExpiredError / JsonWebTokenError)
 * so the auth middleware and error handler can inspect error.name correctly.
 */
export const verifyAccessToken = (token) => {
  // Let the original JWT error propagate — do NOT wrap it
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 * Preserves the original JWT error.
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Build consistent cookie options for both set and clear operations.
 * Uses the same SameSite value so clear always matches what was set.
 */
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax");
  let secure = isProduction;
  if (process.env.COOKIE_SECURE === "false") secure = false;
  if (process.env.COOKIE_SECURE === "true") secure = true;
  return { sameSite, secure };
};

/**
 * Set HTTP-only cookie with token
 */
export const setTokenCookie = (res, name, token, maxAge) => {
  const { sameSite, secure } = getCookieOptions();
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    maxAge,
    path: "/",
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  res.cookie(name, token, options);
};

/**
 * Clear authentication cookies
 * Uses the SAME SameSite/Secure as setTokenCookie to ensure the browser matches them.
 */
export const clearAuthCookies = (res) => {
  const { sameSite, secure } = getCookieOptions();
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
};

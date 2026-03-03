import express from "express";
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validator.js";
import { authLimiter, passwordResetLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

// Public routes with rate limiting
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/forgot-password", passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", passwordResetLimiter, validate(resetPasswordSchema), resetPassword);
router.post("/refresh", refreshAccessToken);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.post("/logout", logout);
router.get("/me", getProfile);
router.patch("/profile", validate(updateProfileSchema), updateProfile);
router.post("/change-password", validate(changePasswordSchema), changePassword);

export default router;

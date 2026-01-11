/**
 * Authentication Routes
 * Defines routes for user authentication
 */

import express from 'express';
import {
  register,
  login,
  validateToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/validate', validateToken);
router.post('/logout', logout);
router.get('/me', getMe);
router.patch('/profile', updateProfile);
router.patch('/password', changePassword);

export default router;

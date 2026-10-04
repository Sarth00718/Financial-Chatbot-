/**
 * User Model
 * Represents application users with authentication and authorization
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },

    // Role-Based Access Control
    role: {
      type: String,
      enum: ["user", "admin", "analyst"],
      default: "user",
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // OAuth provider metadata
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      select: false,
    },

    // Email Verification
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpire: {
      type: Date,
      select: false,
    },

    // Refresh Token for JWT
    refreshToken: {
      type: String,
      select: false,
    },

    // Last Login
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token

// Generate email verification token
userSchema.methods.generateVerificationToken = function () {
  const verificationToken = new mongoose.Types.ObjectId().toString();
  this.emailVerificationToken = verificationToken;
  this.emailVerificationExpire = Date.now() + 86400000; // 24 hours
  return verificationToken;
};

export const User = mongoose.model("User", userSchema);

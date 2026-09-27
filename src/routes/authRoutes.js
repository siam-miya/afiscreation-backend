import express from "express";

import {
  registerUser,
  verifyOTP,
  loginUser,
  logoutUser,
  googleAuth,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
  refreshToken,
} from "../controllers/authController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

import {
  registerLimiter,
  loginLimiter,
  googleLimiter,
  otpLimiter,
  passwordLimiter,
  refreshLimiter,
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

/* =========================
   AUTH
========================= */

// Register
router.post(
  "/register",
  registerLimiter,
  registerUser
);

// Verify OTP
router.post(
  "/verify-otp",
  otpLimiter,
  verifyOTP
);

// Login
router.post(
  "/login",
  loginLimiter,
  loginUser
);

// Google Login
router.post(
  "/google",
  googleLimiter,
  googleAuth
);

// Refresh access token
router.post(
  "/refresh",
  refreshLimiter,
  refreshToken
);

// Logout
router.post(
  "/logout",
  logoutUser
);


/* =========================
   PASSWORD
========================= */

// Forgot password
router.post(
  "/forgot-password",
  passwordLimiter,
  forgotPassword
);

// Reset password
router.post(
  "/reset-password",
  passwordLimiter,
  resetPassword
);

// Change password
router.put(
  "/change-password",
  protect,
  passwordLimiter,
  changePassword
);


/* =========================
   USER PROFILE
========================= */

// Update profile
router.put(
  "/update-profile",
  protect,
  upload.single("profileImage"),
  updateProfile
);


/* =========================
   ADMIN / MODERATOR
========================= */

// Get all users
router.get(
  "/users",
  protect,
  authorize("admin", "moderator"),
  getAllUsers
);

// Update user role
router.put(
  "/users/:id/role",
  protect,
  authorize("admin", "moderator"),
  updateUserRole
);

// Delete user
router.delete(
  "/users/:id",
  protect,
  authorize("admin"),
  deleteUser
);

export default router;


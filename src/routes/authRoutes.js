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
  authLimiter,
  otpLimiter,
  passwordLimiter,
  refreshLimiter,
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

/* Authentication */

router.post(
  "/register",
  authLimiter,
  registerUser
);

router.post(
  "/verify-otp",
  otpLimiter,
  verifyOTP
);

router.post(
  "/login",
  authLimiter,
  loginUser
);

router.post(
  "/google",
  authLimiter,
  googleAuth
);

router.post(
  "/refresh",
  refreshLimiter,
  refreshToken
);

router.post(
  "/logout",
  logoutUser
);

/* Password */

router.post(
  "/forgot-password",
  passwordLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  passwordLimiter,
  resetPassword
);

router.put(
  "/change-password",
  protect,
  passwordLimiter,
  changePassword
);

/* Profile */

router.put(
  "/update-profile",
  protect,
  upload.single("profileImage"),
  updateProfile
);

/* Admin / Moderator */

router.get(
  "/users",
  protect,
  authorize("admin", "moderator"),
  getAllUsers
);

router.put(
  "/users/:id/role",
  protect,
  authorize("admin", "moderator"),
  updateUserRole
);

router.delete(
  "/users/:id",
  protect,
  authorize("admin"),
  deleteUser
);

export default router;
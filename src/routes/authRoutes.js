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
  deleteUser
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js"; 

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/google", googleAuth); 
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", protect, changePassword); 

// Profile Update Route
router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);

// User Management Routes
router.get("/users", protect, authorize("admin", "moderator"), getAllUsers);

// এখানে admin এবং moderator দুটোই দেওয়া হলো, কন্ট্রোলারে গিয়ে রেস্ট্রিকশন চেক করা হবে
router.put("/users/:id/role", protect, authorize("admin", "moderator"), updateUserRole);

router.delete("/users/:id", protect, authorize("admin"), deleteUser);

export default router;
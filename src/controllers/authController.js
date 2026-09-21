import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    message,
    token,
    user: { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      picture: user.picture || "",
      address: user.address || ""
    },
  });
};

// 1. Register with OTP
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });

    if (user && user.isVerified) {
      return res.status(400).json({ success: false, message: "User already exists with this email!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 10 * 60 * 1000;

    if (user && !user.isVerified) {
      user.name = name;
      user.password = password; 
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password,
        otp,
        otpExpire,
        isVerified: false,
      });
    }

    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to Afis Creation!</h2>
        <p>Your Email Verification Code is:</p>
        <h1 style="color: #6B21A8; letter-spacing: 3px;">${otp}</h1>
        <p>This code is valid for 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "Account Verification OTP - Afis Creation",
      html: message,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete registration.",
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Verify OTP Controller
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "User is already verified!" });
    }

    if (user.otp !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res, "Account verified and registered successfully!");
  } catch (error) {
    next(error);
  }
};

// 3. Login Controller
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password!" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password!" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        success: false, 
        message: "This account uses Google Sign-In. Please login with Google!" 
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password!" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email first!" });
    }

    sendTokenResponse(user, 200, res, "Logged in successfully!");
  } catch (error) {
    next(error);
  }
};

// 4. Logout Controller
export const logoutUser = (req, res, next) => {
  try {
    res.cookie("token", "none", { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, message: "Logged out successfully!" });
  } catch (error) {
    next(error);
  }
};

// 5. Google Auth Controller
export const googleAuth = async (req, res, next) => {
  try {
    const { name, email, picture, googleId } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: "Invalid Google authentication data!" });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId || !user.picture) {
        user.googleId = googleId;
        user.picture = picture || user.picture;
        user.isVerified = true;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        picture,
        googleId,
        isVerified: true,
      });
    }

    sendTokenResponse(user, 200, res, "Google login successful!");
  } catch (error) {
    next(error);
  }
};

// 6. Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "No user found with this email!" });
    }

    if (user.googleId && !user.password) {
      return res.status(400).json({ 
        success: false, 
        message: "This account uses Google Sign-In. Please login with Google!" 
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = crypto.createHash("sha256").update(resetCode).digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const message = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Your Password Reset Code is:</p>
        <h1 style="color: #6B21A8; letter-spacing: 3px;">${resetCode}</h1>
        <p>This code is valid for 10 minutes. If you didn't request this, please ignore.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset OTP - Afis Creation",
        html: message,
      });

      res.status(200).json({ success: true, message: "Reset code sent to your email!" });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: "Email could not be sent" });
    }
  } catch (error) {
    next(error);
  }
};

// 7. Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(resetCode).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code!" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful! Please login with new password." });
  } catch (error) {
    next(error);
  }
};

// 8. Change Password
export const changePassword = async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide current and new passwords!" });
    }

    let user;
    if (req.user && req.user._id) {
      user = await User.findById(req.user._id).select("+password");
    } else if (email) {
      user = await User.findOne({ email }).select("+password");
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        success: false, 
        message: "This account uses Google Sign-In. You cannot change password directly." 
      });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect!" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    next(error);
  }
};

// 11. Update Profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    if (name) {
      user.name = name;
    }

    if (address !== undefined) {
      user.address = address;
    }

    if (req.file && req.file.path) {
      user.picture = req.file.path;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture || "",
        address: user.address || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

// 9. Get All Users (Admin & Moderator Access)
export const getAllUsers = async (req, res, next) => {
  try {
    let query = {};

    if (req.user && req.user.role === "moderator") {
      query = { role: { $ne: "admin" } };
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// 10. Update User Role (Admin & Moderator Access with restrictions)
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!["customer", "moderator", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified!" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    if (req.user.role === "moderator") {
      if (role === "admin") {
        return res.status(403).json({ success: false, message: "Moderators cannot assign the admin role!" });
      }
      if (user.role === "admin") {
        return res.status(403).json({ success: false, message: "Moderators cannot modify admin users!" });
      }
    }
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: false }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully!`,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 12. Delete User (Only Admin Access)
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    if (req.user && req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account!" });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};
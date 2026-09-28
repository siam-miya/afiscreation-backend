import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";

import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "../utils/tokenUtils.js";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

const isProduction =
  process.env.NODE_ENV === "production";

/* =========================
   COOKIE OPTIONS
========================= */

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const ACCESS_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: ACCESS_TOKEN_MAX_AGE,
};

const REFRESH_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: REFRESH_TOKEN_MAX_AGE,
};

const CLEAR_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
};

/* =========================
   HELPERS
========================= */

const normalizeEmail = (email = "") => {
  return String(email).trim().toLowerCase();
};

const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOTP = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

const safeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    picture: user.picture || "",
    address: user.address || "",
    isVerified: user.isVerified,
  };
};

const clearAuthCookies = (res) => {
  res.clearCookie(
    "accessToken",
    CLEAR_COOKIE_OPTIONS
  );

  res.clearCookie(
    "refreshToken",
    CLEAR_COOKIE_OPTIONS
  );
};

/* =========================
   CREATE SESSION
========================= */

const createSession = async (user, res) => {
  const accessToken = createAccessToken(user);

  const refreshToken = createRefreshToken();

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpire = getRefreshTokenExpiry();

  await user.save({
    validateBeforeSave: false,
  });

  res.cookie(
    "accessToken",
    accessToken,
    ACCESS_COOKIE_OPTIONS
  );

  res.cookie(
    "refreshToken",
    refreshToken,
    REFRESH_COOKIE_OPTIONS
  );

  return safeUser(user);
};

/* =========================
   REGISTER
========================= */

export const registerUser = async (
  req,
  res,
  next
) => {
  try {
    const name = req.body?.name?.trim();
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required.",
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be between 2 and 100 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    let user = await User.findOne({ email }).select(
      "+otpHash +otpExpire +otpAttempts"
    );

    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    const otpExpire = new Date(
      Date.now() + 10 * 60 * 1000
    );

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message:
            "An account with this email already exists.",
        });
      }

      user.name = name;
      user.password = password;
      user.otpHash = otpHash;
      user.otpExpire = otpExpire;
      user.otpAttempts = 0;

      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password,
        otpHash,
        otpExpire,
        otpAttempts: 0,
      });
    }

    try {
      await sendEmail({
        to: email,
        subject:
          "Afis Creation - Verify Your Email",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>Verify Your Afis Creation Account</h2>

            <p>Hello ${name},</p>

            <p>Your verification code is:</p>

            <h1 style="letter-spacing:8px">${otp}</h1>

            <p>This code will expire in 10 minutes.</p>

            <p>
              If you did not create this account,
              you can ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error(
        "Registration email error:",
        emailError
      );

      user.otpHash = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;

      await user.save({
        validateBeforeSave: false,
      });

      return res.status(500).json({
        success: false,
        message:
          "Unable to send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email for the OTP.",
      email,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   VERIFY OTP
========================= */

export const verifyOTP = async (
  req,
  res,
  next
) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(
      req.body?.otp || ""
    ).trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid email and 6-digit OTP are required.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+otpHash +otpExpire +otpAttempts +refreshTokenHash +refreshTokenExpire"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid verification request.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Account is already verified.",
      });
    }

    if (!user.otpHash || !user.otpExpire) {
      return res.status(400).json({
        success: false,
        message:
          "OTP is invalid or has expired.",
      });
    }

    if (user.otpExpire.getTime() < Date.now()) {
      user.otpHash = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;

      await user.save({
        validateBeforeSave: false,
      });

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new one.",
      });
    }

    if ((user.otpAttempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        message:
          "Too many invalid OTP attempts.",
      });
    }

    user.otpAttempts =
      (user.otpAttempts || 0) + 1;

    if (hashOTP(otp) !== user.otpHash) {
      await user.save({
        validateBeforeSave: false,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;

    await user.save({
      validateBeforeSave: false,
    });

    const userData = await createSession(
      user,
      res
    );

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully.",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   LOGIN
========================= */

export const loginUser = async (
  req,
  res,
  next
) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+password +refreshTokenHash +refreshTokenExpire"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    if (!user.password && user.googleId) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google login. Please continue with Google.",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const isMatch =
      await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your email before logging in.",
      });
    }

    const userData = await createSession(
      user,
      res
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   REFRESH TOKEN
========================= */

export const refreshToken = async (
  req,
  res,
  next
) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken;

    if (!refreshToken) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message:
          "Refresh token missing.",
      });
    }

    const refreshTokenHash =
      hashToken(refreshToken);

    const user = await User.findOne({
      refreshTokenHash,
      refreshTokenExpire: {
        $gt: new Date(),
      },
    }).select(
      "+refreshTokenHash +refreshTokenExpire"
    );

    if (!user) {
      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired refresh token.",
      });
    }

    if (!user.isVerified) {
      user.refreshTokenHash = undefined;
      user.refreshTokenExpire = undefined;

      await user.save({
        validateBeforeSave: false,
      });

      clearAuthCookies(res);

      return res.status(401).json({
        success: false,
        message:
          "Account verification required.",
      });
    }

    const userData = await createSession(
      user,
      res
    );

    return res.status(200).json({
      success: true,
      message: "Session refreshed.",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   LOGOUT
========================= */

export const logoutUser = async (
  req,
  res,
  next
) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken;

    if (refreshToken) {
      const refreshTokenHash =
        hashToken(refreshToken);

      await User.updateOne(
        {
          refreshTokenHash,
        },
        {
          $unset: {
            refreshTokenHash: 1,
            refreshTokenExpire: 1,
          },
        }
      );
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message:
        "Logged out successfully.",
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
};

/* =========================
   GOOGLE AUTH
========================= */

export const googleAuth = async (
  req,
  res,
  next
) => {
  try {
    const { accessToken } = req.body || {};

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message:
          "Google access token is required.",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message:
          "Google authentication is not configured.",
      });
    }

    let tokenInfo;

    try {
      tokenInfo =
        await googleClient.getTokenInfo(
          accessToken
        );
    } catch {
      return res.status(401).json({
        success: false,
        message:
          "Invalid Google authentication.",
      });
    }

    if (
      tokenInfo.aud !==
      process.env.GOOGLE_CLIENT_ID
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid Google client.",
      });
    }

    const googleResponse =
      await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

    if (!googleResponse.ok) {
      return res.status(401).json({
        success: false,
        message:
          "Unable to verify Google account.",
      });
    }

    const googleUser =
      await googleResponse.json();

    if (
      !googleUser.sub ||
      !googleUser.email ||
      googleUser.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Google email could not be verified.",
      });
    }

    const email = normalizeEmail(
      googleUser.email
    );

    let user = await User.findOne({
      email,
    }).select(
      "+refreshTokenHash +refreshTokenExpire"
    );

    if (user) {
      if (
        user.googleId &&
        user.googleId !== googleUser.sub
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This email is linked to another Google account.",
        });
      }

      user.googleId = googleUser.sub;
      user.picture =
        googleUser.picture ||
        user.picture ||
        "";
      user.isVerified = true;

      await user.save({
        validateBeforeSave: false,
      });
    } else {
      user = await User.create({
        name:
          googleUser.name ||
          googleUser.email.split("@")[0],
        email,
        googleId: googleUser.sub,
        picture:
          googleUser.picture || "",
        isVerified: true,
      });
    }

    const userData = await createSession(
      user,
      res
    );

    return res.status(200).json({
      success: true,
      message:
        "Google login successful.",
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   FORGOT PASSWORD
========================= */

export const forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    const genericResponse = {
      success: true,
      message:
        "If an account exists with this email, a password reset code has been sent.",
    };

    if (!email) {
      return res
        .status(200)
        .json(genericResponse);
    }

    const user = await User.findOne({
      email,
    }).select(
      "+resetPasswordToken +resetPasswordExpire +resetPasswordAttempts"
    );

    if (
      !user ||
      (!user.password && user.googleId)
    ) {
      return res
        .status(200)
        .json(genericResponse);
    }

    const resetCode = generateOTP();

    user.resetPasswordToken =
      hashToken(resetCode);

    user.resetPasswordExpire =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    user.resetPasswordAttempts = 0;

    await user.save({
      validateBeforeSave: false,
    });

    try {
      await sendEmail({
        to: email,
        subject:
          "Afis Creation - Password Reset",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>Password Reset</h2>

            <p>Your Afis Creation password reset code is:</p>

            <h1 style="letter-spacing:8px">${resetCode}</h1>

            <p>This code will expire in 10 minutes.</p>

            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch {
      user.resetPasswordToken =
        undefined;
      user.resetPasswordExpire =
        undefined;
      user.resetPasswordAttempts = 0;

      await user.save({
        validateBeforeSave: false,
      });
    }

    return res
      .status(200)
      .json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/* =========================
   RESET PASSWORD
========================= */

export const resetPassword = async (
  req,
  res,
  next
) => {
  try {
    const email = normalizeEmail(
      req.body?.email
    );

    const resetCode = String(
      req.body?.resetCode ||
        req.body?.otp ||
        ""
    ).trim();

    const newPassword =
      req.body?.newPassword;

    if (
      !email ||
      !/^\d{6}$/.test(resetCode) ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, 6-digit reset code and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters.",
      });
    }

    const user = await User.findOne({
      email,
    }).select(
      "+password +resetPasswordToken +resetPasswordExpire +resetPasswordAttempts +refreshTokenHash +refreshTokenExpire"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset code.",
      });
    }

    if (
      !user.resetPasswordToken ||
      !user.resetPasswordExpire
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset code.",
      });
    }

    if (
      user.resetPasswordExpire.getTime() <
      Date.now()
    ) {
      user.resetPasswordToken =
        undefined;
      user.resetPasswordExpire =
        undefined;
      user.resetPasswordAttempts = 0;

      await user.save({
        validateBeforeSave: false,
      });

      return res.status(400).json({
        success: false,
        message:
          "Reset code has expired.",
      });
    }

    if (
      (user.resetPasswordAttempts || 0) >=
      5
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Too many invalid reset attempts.",
      });
    }

    user.resetPasswordAttempts =
      (user.resetPasswordAttempts || 0) + 1;

    if (
      hashToken(resetCode) !==
      user.resetPasswordToken
    ) {
      await user.save({
        validateBeforeSave: false,
      });

      return res.status(400).json({
        success: false,
        message:
          "Invalid reset code.",
      });
    }

    user.password = newPassword;

    user.resetPasswordToken =
      undefined;
    user.resetPasswordExpire =
      undefined;
    user.resetPasswordAttempts = 0;

    user.refreshTokenHash = undefined;
    user.refreshTokenExpire = undefined;

    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    await user.save();

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successful. Please login again.",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   CHANGE PASSWORD
========================= */

export const changePassword = async (
  req,
  res,
  next
) => {
  try {
    const currentPassword =
      req.body?.currentPassword;

    const newPassword =
      req.body?.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters.",
      });
    }

    const user = await User.findById(
      req.user._id
    ).select(
      "+password +refreshTokenHash +refreshTokenExpire"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "Google accounts cannot change password here.",
      });
    }

    const isMatch =
      await user.matchPassword(
        currentPassword
      );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Current password is incorrect.",
      });
    }

    user.password = newPassword;

    user.refreshTokenHash = undefined;
    user.refreshTokenExpire = undefined;

    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    await user.save();

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please login again.",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   UPDATE PROFILE
========================= */

export const updateProfile = async (
  req,
  res,
  next
) => {
  try {
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (req.body?.name !== undefined) {
      const name = req.body.name.trim();

      if (
        name.length < 2 ||
        name.length > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name must be between 2 and 100 characters.",
        });
      }

      user.name = name;
    }

    if (req.body?.address !== undefined) {
      const address =
        req.body.address.trim();

      if (address.length > 500) {
        return res.status(400).json({
          success: false,
          message:
            "Address cannot exceed 500 characters.",
        });
      }

      user.address = address;
    }

    if (req.file?.path) {
      user.picture = req.file.path;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      user: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   GET ALL USERS
========================= */

export const getAllUsers = async (
  req,
  res,
  next
) => {
  try {
    const currentRole =
      String(req.user.role || "")
        .trim()
        .toLowerCase();

    const filter =
      currentRole === "moderator"
        ? {
            role: {
              $ne: "admin",
            },
          }
        : {};

    const users = await User.find(filter)
      .select("-password")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   UPDATE USER ROLE
========================= */

export const updateUserRole = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const role = String(
      req.body?.role || ""
    )
      .trim()
      .toLowerCase();

    if (
      ![
        "customer",
        "moderator",
        "admin",
      ].includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid role.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      req.user._id.toString() ===
      user._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot change your own role.",
      });
    }

    const currentRole =
      String(req.user.role || "")
        .trim()
        .toLowerCase();

    const targetCurrentRole =
      String(user.role || "")
        .trim()
        .toLowerCase();

    if (
      currentRole === "moderator" &&
      (targetCurrentRole === "admin" ||
        role === "admin")
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Moderators cannot manage admin roles.",
      });
    }

    user.role = role;

    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    user.refreshTokenHash = undefined;
    user.refreshTokenExpire = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "User role updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   DELETE USER
========================= */

export const deleteUser = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (
      req.user._id.toString() ===
      id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot delete your own account.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "User deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
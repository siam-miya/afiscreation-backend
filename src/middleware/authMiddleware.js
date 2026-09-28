import mongoose from "mongoose";

import User from "../models/userModel.js";
import {
  verifyAccessToken,
} from "../utils/tokenUtils.js";

export const protect = async (
  req,
  res,
  next
) => {
  try {
    const token =
      req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    let decoded;

    try {
      decoded =
        verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message:
          "Session expired. Please login again.",
      });
    }

    if (
      !decoded?.id ||
      !mongoose.Types.ObjectId.isValid(
        decoded.id
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid session.",
      });
    }

    const user =
      await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify your account first.",
      });
    }

    const currentTokenVersion =
      Number(user.tokenVersion || 0);

    const tokenVersion =
      Number(decoded.tokenVersion || 0);

    if (
      currentTokenVersion !==
      tokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Session is no longer valid. Please login again.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  const allowedRoles =
    roles.map((role) =>
      String(role)
        .trim()
        .toLowerCase()
    );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const currentRole =
      String(req.user.role || "")
        .trim()
        .toLowerCase();

    if (
      !allowedRoles.includes(
        currentRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized for this action.",
      });
    }

    next();
  };
};
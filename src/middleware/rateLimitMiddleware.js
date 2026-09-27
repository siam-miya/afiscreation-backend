
import rateLimit from "express-rate-limit";

const createLimiter = (windowMs, limit, message) => {
  return rateLimit({
    windowMs,
    limit,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

/**
 * REGISTER
 * 5 registration attempts per 15 minutes
 */
export const registerLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many signup attempts. Please wait a few minutes and try again."
);

/**
 * LOGIN
 * 10 login attempts per 15 minutes
 */
export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please wait a few minutes and try again."
);

/**
 * GOOGLE LOGIN
 * 10 attempts per 15 minutes
 */
export const googleLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many Google login attempts. Please wait a few minutes and try again."
);

/**
 * OTP VERIFICATION
 * 5 attempts per 10 minutes
 */
export const otpLimiter = createLimiter(
  10 * 60 * 1000,
  5,
  "Too many OTP attempts. Please wait a few minutes and try again."
);

/**
 * PASSWORD / RESET
 * 5 attempts per 15 minutes
 */
export const passwordLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many password attempts. Please wait a few minutes and try again."
);

/**
 * REFRESH TOKEN
 * 30 attempts per 15 minutes
 */
export const refreshLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  "Too many session refresh attempts. Please try again later."
);


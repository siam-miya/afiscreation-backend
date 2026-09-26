import rateLimit from "express-rate-limit";

const createLimiter = (
  windowMs,
  limit,
  message
) => {
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

export const authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many authentication attempts. Please try again later."
);

export const otpLimiter = createLimiter(
  10 * 60 * 1000,
  5,
  "Too many OTP attempts. Please try again later."
);

export const passwordLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many password attempts. Please try again later."
);

export const refreshLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  "Too many session refresh attempts."
);
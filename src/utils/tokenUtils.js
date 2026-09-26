import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_ISSUER =
  process.env.JWT_ISSUER || "afiscreation-api";

const JWT_AUDIENCE =
  process.env.JWT_AUDIENCE || "afiscreation-web";

const JWT_ACCESS_EXPIRE =
  process.env.JWT_ACCESS_EXPIRE || "15m";

const JWT_REFRESH_EXPIRE =
  process.env.JWT_REFRESH_EXPIRE || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

const parseDurationToMs = (value) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);

  if (!match) {
    throw new Error(
      "JWT duration must be like 15m, 7d, 12h or 60s"
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

export const ACCESS_TOKEN_MAX_AGE =
  parseDurationToMs(JWT_ACCESS_EXPIRE);

export const REFRESH_TOKEN_MAX_AGE =
  parseDurationToMs(JWT_REFRESH_EXPIRE);

export const createAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_ACCESS_EXPIRE,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
};

export const createRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const getRefreshTokenExpiry = () => {
  return new Date(
    Date.now() + REFRESH_TOKEN_MAX_AGE
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};
import crypto from "crypto";
import jwt from "jsonwebtoken";
import validator from "validator";

export const OTP_TTL_MS = 5 * 60 * 1000;          // OTP valid for 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;  // one OTP email per minute
export const OTP_MAX_ATTEMPTS = 5;
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // time to choose a new password after OTP

const USER_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

// Frontend and API are on different origins, so the session cookie must be
// SameSite=None (which requires Secure). Cross-site request forgery is
// blocked separately by the Origin check in middleware/originCheck.js.
export const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  path: "/",
  ...(maxAge ? { maxAge } : {}),
});

export const clearAuthCookie = (res, name = "token") => {
  res.clearCookie(name, cookieOptions());
};

export const setUserSession = (res, user) => {
  const token = jwt.sign(
    { id: user._id.toString(), role: "user", tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: USER_SESSION_MS / 1000 }
  );
  res.cookie("token", token, cookieOptions(USER_SESSION_MS));
};

export const setAdminSession = (res) => {
  const token = jwt.sign(
    { sub: "admin", role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: ADMIN_SESSION_MS / 1000 }
  );
  res.cookie("token", token, cookieOptions(ADMIN_SESSION_MS));
};

// 6-digit OTP from a cryptographically secure source.
export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// OTPs and reset tokens are stored only as keyed hashes, so a database leak
// (or a decoded cookie) never reveals a usable code.
export const hashSecret = (value) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(value)).digest("hex");

export const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

export const generateResetToken = () => crypto.randomBytes(32).toString("hex");

// Request-body helpers: reject objects/arrays so values like {"$ne": null}
// can never reach a Mongo query.
export const asEmail = (value) => {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return validator.isEmail(email) ? email : null;
};

export const asString = (value, { max = 500 } = {}) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

export const asOtp = (value) => {
  const str = typeof value === "number" ? String(value) : value;
  return typeof str === "string" && /^\d{6}$/.test(str.trim()) ? str.trim() : null;
};

export const validatePassword = (password) => {
  if (typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must have at least 8 characters";
  if (Buffer.byteLength(password) > 72) return "Password is too long";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number";
  }
  return null;
};

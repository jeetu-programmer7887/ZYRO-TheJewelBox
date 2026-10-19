import userModel from "../models/userModel.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import sendVerificationEmail from "../middleware/sendVerificationEmail.js";
import {
  OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, OTP_MAX_ATTEMPTS, RESET_TOKEN_TTL_MS,
  setUserSession, setAdminSession, clearAuthCookie, cookieOptions,
  generateOtp, hashSecret, safeEqual, generateResetToken,
  asEmail, asString, asOtp, validatePassword,
} from "../utils/security.js";

const ADMIN_OTP_COOKIE = "admin_otp";

const isAdminEmail = (email) =>
  !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase();

// Emails used to be stored exactly as typed, so look them up case-insensitively.
const findUserByEmail = (email) =>
  userModel.findOne({ email }).collation({ locale: "en", strength: 2 });

// The one shape of "the logged-in customer" sent to the frontend, used by
// both /session and every login response, so the app has the full profile
// right after login without another request.
const sessionUser = (user) => ({
  firstName: user.firstName,
  lastName: user.lastName,
  username: `${user.firstName} ${user.lastName}`.trim(),
  email: user.email,
  mobile: user.mobile,
  pincode: user.pincode,
  birthdate: user.birthdate,
  gender: user.gender,
  isGoogleAuth: !!user.isGoogleAuth,
});

const ADMIN_SESSION_USER = { username: "ADMIN PANEL", firstName: "ADMIN", lastName: "PANEL", email: process.env.ADMIN_EMAIL };

const publicUser = (user) => ({
  username: `${user.firstName} ${user.lastName}`.trim(),
  email: user.email,
  role: "user",
  user: sessionUser(user),
});

// Issue a fresh OTP for `user`, store only its hash, and email it.
// Returns false when the email could not be sent.
const issueOtp = async (user, { extendPendingSignup = false } = {}) => {
  const otp = generateOtp();
  user.verificationCode = hashSecret(otp);
  user.verificationAttempts = 0;
  user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  user.otpSentAt = new Date();
  if (extendPendingSignup) {
    // Unverified sign-ups are auto-deleted by a TTL index when this passes.
    user.verificationExpireAt = new Date(Date.now() + OTP_TTL_MS + 60 * 1000);
  }
  await user.save();
  return sendVerificationEmail(user.email, otp);
};

const cooldownRemaining = (user) => {
  if (!user.otpSentAt) return 0;
  return Math.max(0, Math.ceil((user.otpSentAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000));
};

// Checks `otp` against the stored hash. Burns the code after too many
// wrong guesses so it can't be brute-forced.
const checkOtp = async (user, otp) => {
  if (!user.verificationCode || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
    return { ok: false, message: "This code has expired. Please request a new one." };
  }
  if ((user.verificationAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "Too many incorrect attempts. Please request a new code." };
  }
  if (!safeEqual(hashSecret(otp), user.verificationCode)) {
    user.verificationAttempts = (user.verificationAttempts || 0) + 1;
    const left = OTP_MAX_ATTEMPTS - user.verificationAttempts;
    if (left <= 0) {
      user.verificationCode = null;
      user.otpExpiry = null;
    }
    await user.save();
    return {
      ok: false,
      message: left > 0
        ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`
        : "Too many incorrect attempts. Please request a new code.",
    };
  }
  return { ok: true };
};

//Route for Login
const loginUser = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== "string" || !password) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please enter your email and password" });
    }

    //For Admin Login only: password, then a one-time code sent by email
    if (isAdminEmail(email)) {
      const expected = process.env.ADMIN_PASSWORD || "";
      if (!expected || !safeEqual(password, expected)) {
        return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Invalid email or password" });
      }

      const otp = generateOtp();
      const sent = await sendVerificationEmail(email, otp);
      if (!sent) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({ success: false, message: "Couldn't send the verification code. Please try again." });
      }

      // The cookie holds only a keyed hash of the code plus its expiry,
      // so reading the cookie does not reveal the code.
      const payload = JSON.stringify({ h: hashSecret(otp), exp: Date.now() + OTP_TTL_MS, n: 0 });
      res.cookie(ADMIN_OTP_COOKIE, payload, { ...cookieOptions(OTP_TTL_MS), signed: true });

      return res.json({
        success: true,
        isAdmin: true,
        password: true,
        message: "Verification code sent to the admin email",
        email,
      });
    }

    const user = await findUserByEmail(email);

    if (!user || (!user.verified && !user.isGoogleAuth)) {
      if (user && !user.verified) {
        return res.status(httpStatus.FORBIDDEN).json({
          success: false,
          needsVerification: true,
          message: "Please verify your email first. We can send you a new code.",
        });
      }
      return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Invalid email or password" });
    }

    // Signed up with Google and never set a password
    if (user.isGoogleAuth && !user.password) {
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Invalid email or password" });
    }

    setUserSession(res, user);
    return res.json({
      success: true,
      message: "Logged in successfully",
      ...publicUser(user),
    });
  } catch (error) {
    console.error("User Login Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Admin step 2: check the emailed code and start an admin session
const verifyAdmin = (req, res) => {
  try {
    const raw = req.signedCookies?.[ADMIN_OTP_COOKIE];
    const otp = asOtp(req.body.otp);

    if (!raw) {
      return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Your code has expired. Please log in again." });
    }
    if (!otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Enter the 6-digit code" });
    }

    let state;
    try { state = JSON.parse(raw); } catch { state = null; }
    if (!state || state.exp < Date.now() || state.n >= OTP_MAX_ATTEMPTS) {
      clearAuthCookie(res, ADMIN_OTP_COOKIE);
      return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Your code has expired. Please log in again." });
    }

    if (!safeEqual(hashSecret(otp), state.h)) {
      const next = { ...state, n: state.n + 1 };
      res.cookie(ADMIN_OTP_COOKIE, JSON.stringify(next), { ...cookieOptions(Math.max(0, state.exp - Date.now())), signed: true });
      return res.status(httpStatus.FORBIDDEN).json({ success: false, isVerified: false, message: "Invalid code" });
    }

    clearAuthCookie(res, ADMIN_OTP_COOKIE);
    setAdminSession(res);
    return res.json({
      success: true,
      isAdmin: true,
      isVerified: true,
      message: "Admin logged in",
      email: process.env.ADMIN_EMAIL,
      role: "admin",
      user: { ...ADMIN_SESSION_USER, email: process.env.ADMIN_EMAIL },
    });
  } catch (error) {
    console.error("Admin Verify Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

//Route for Registeration
const registerUser = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    const firstName = asString(req.body.firstName, { max: 50 });
    const lastName = asString(req.body.lastName, { max: 50 });
    const { password } = req.body;

    if (!firstName || !lastName) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please enter your first and last name" });
    }
    if (!email) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please enter a valid email" });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: passwordError });
    }
    if (isAdminEmail(email)) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "This email cannot be registered." });
    }

    let user = await findUserByEmail(email);

    if (user && (user.verified || user.isGoogleAuth)) {
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: user.isGoogleAuth
          ? "An account with this email already exists. Please continue with Google."
          : "An account with this email already exists. Please log in.",
      });
    }

    if (user) {
      // A previous sign-up was never verified: let them start over, but
      // respect the resend cooldown so the inbox can't be flooded.
      const wait = cooldownRemaining(user);
      if (wait > 0) {
        return res.status(httpStatus.TOO_MANY_REQUESTS).json({
          success: false,
          message: `Please wait ${wait} seconds before requesting another code.`,
        });
      }
      user.firstName = firstName;
      user.lastName = lastName;
      user.password = await bcrypt.hash(password, 10);
    } else {
      user = new userModel({
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, 10),
        verified: false,
      });
    }

    const sent = await issueOtp(user, { extendPendingSignup: true });
    if (!sent) {
      return res.status(httpStatus.SERVICE_UNAVAILABLE).json({ success: false, message: "Couldn't send the verification email. Please try again." });
    }

    return res.json({
      success: true,
      message: "Verification code sent to your email",
      otpExpiresIn: OTP_TTL_MS / 1000,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Verify a Google OAuth access token with Google itself, and make sure it
// was issued to this app. Never trust profile data sent by the browser.
const fetchGoogleProfile = async (accessToken) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const { data: info } = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
    params: { access_token: accessToken },
    timeout: 7000,
  });
  if (clientId && info.aud !== clientId && info.azp !== clientId) {
    throw new Error("Google token was issued to a different app");
  }
  const { data: profile } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 7000,
  });
  if (!profile.email || profile.email_verified === false) {
    throw new Error("Google account email is not verified");
  }
  return profile;
};

//For google Login & SignUP
const withGoogle = async (req, res) => {
  try {
    const accessToken = asString(req.body.accessToken, { max: 4096 });
    if (!accessToken) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Google sign-in failed. Please try again." });
    }

    let profile;
    try {
      profile = await fetchGoogleProfile(accessToken);
    } catch (error) {
      console.error("Google token verification failed:", error.message);
      return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Google sign-in failed. Please try again." });
    }

    const email = asEmail(profile.email);
    if (!email || isAdminEmail(email)) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "This email cannot be used to sign in." });
    }

    let user = await findUserByEmail(email);

    if (user) {
      // Google has verified this email address, so it's safe to link the
      // Google identity to an existing account with the same email.
      let changed = false;
      if (!user.googleId) { user.googleId = profile.sub; changed = true; }
      if (!user.verified) {
        user.verified = true;
        user.verificationCode = null;
        user.otpExpiry = null;
        user.verificationExpireAt = undefined;
        changed = true;
      }
      if (changed) await user.save();
    } else {
      user = await userModel.create({
        firstName: profile.given_name || profile.name || "ZYRO",
        lastName: profile.family_name || "Customer",
        email,
        isGoogleAuth: true,
        googleId: profile.sub,
        verified: true,
      });
    }

    setUserSession(res, user);
    return res.status(httpStatus.OK).json({
      success: true,
      message: "Logged in successfully",
      ...publicUser(user),
    });
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

//For Verifying the email
const verifyEmail = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    const otp = asOtp(req.body.otp);
    if (!email || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Enter the 6-digit code" });
    }

    const user = await findUserByEmail(email);
    if (!user || user.verified) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "This code is invalid or has expired." });
    }

    const result = await checkOtp(user, otp);
    if (!result.ok) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: result.message });
    }

    user.verified = true;
    user.verificationCode = null;
    user.verificationAttempts = 0;
    user.otpExpiry = null;
    user.verificationExpireAt = undefined;
    await user.save();

    setUserSession(res, user);
    return res.status(httpStatus.OK).json({
      success: true,
      message: "Email verified successfully",
      ...publicUser(user),
    });
  } catch (error) {
    console.error("Verify Email Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Resend a code for sign-up verification or password reset
const resendOtp = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    const purpose = req.body.purpose === "reset" ? "reset" : "verify";
    const genericOk = { success: true, message: "If an account exists for this email, a new code has been sent.", otpExpiresIn: OTP_TTL_MS / 1000 };

    if (!email) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please enter a valid email" });
    }

    const user = await findUserByEmail(email);
    const eligible = user && (purpose === "verify" ? !user.verified : user.verified && !!user.password);
    if (!eligible) return res.json(genericOk);

    const wait = cooldownRemaining(user);
    if (wait > 0) {
      return res.status(httpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: `Please wait ${wait} seconds before requesting another code.`,
        retryAfter: wait,
      });
    }

    const sent = await issueOtp(user, { extendPendingSignup: purpose === "verify" });
    if (!sent) {
      return res.status(httpStatus.SERVICE_UNAVAILABLE).json({ success: false, message: "Couldn't send the email. Please try again." });
    }
    return res.json(genericOk);
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

//For sending otp if forgot password
const forgotPassword = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    if (!email) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please enter a valid email" });
    }

    // Same answer whether or not the account exists, so this endpoint
    // can't be used to discover who shops here.
    const genericOk = {
      success: true,
      message: "If an account exists for this email, we've sent a 6-digit code.",
      otpExpiresIn: OTP_TTL_MS / 1000,
    };

    const user = await findUserByEmail(email);
    if (!user || !user.verified) return res.json(genericOk);

    const wait = cooldownRemaining(user);
    if (wait > 0) {
      return res.status(httpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        message: `Please wait ${wait} seconds before requesting another code.`,
        retryAfter: wait,
      });
    }

    const sent = await issueOtp(user);
    if (!sent) {
      return res.status(httpStatus.SERVICE_UNAVAILABLE).json({ success: false, message: "Couldn't send the email. Please try again." });
    }
    return res.json(genericOk);
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

//For verifying OTP for forgot password: returns a short-lived, single-use reset token
const verifyForgot = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    const otp = asOtp(req.body.otp);
    if (!email || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Enter the 6-digit code" });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.verified) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "This code is invalid or has expired." });
    }

    const result = await checkOtp(user, otp);
    if (!result.ok) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: result.message });
    }

    const resetToken = generateResetToken();
    user.verificationCode = null;
    user.verificationAttempts = 0;
    user.otpExpiry = null;
    user.resetTokenHash = hashSecret(resetToken);
    user.resetTokenExp = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Code verified",
      resetToken,
    });
  } catch (error) {
    console.error("Verify Forgot Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

//For Reseting the password (requires the token from verifyForgot)
const resetPassword = async (req, res) => {
  try {
    const email = asEmail(req.body.email);
    const resetToken = asString(req.body.resetToken, { max: 128 });
    const { newPassword } = req.body;

    if (!email || !resetToken) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Your reset session has expired. Please start again." });
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: passwordError });
    }

    const user = await findUserByEmail(email);
    if (
      !user || !user.resetTokenHash || !user.resetTokenExp ||
      user.resetTokenExp.getTime() < Date.now() ||
      !safeEqual(hashSecret(resetToken), user.resetTokenHash)
    ) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Your reset session has expired. Please start again." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = null;
    user.resetTokenExp = null;
    // Sign out every existing session (e.g. a stolen cookie)
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    return res.status(httpStatus.OK).json({ success: true, message: "Password has been reset. Please log in." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// Who is signed in on this browser? The session cookie is httpOnly, so the
// frontend asks the server instead of keeping its own copy of the role.
const getSession = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const guest = { success: true, loggedIn: false, role: null };
  const token = req.cookies?.token;
  if (!token) return res.json(guest);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === "admin" && decoded.sub === "admin") {
      return res.json({
        success: true, loggedIn: true, role: "admin",
        user: { ...ADMIN_SESSION_USER, email: process.env.ADMIN_EMAIL },
      });
    }
    if (decoded.role === "user" && decoded.id) {
      const user = await userModel.findById(decoded.id)
        .select("firstName lastName email mobile pincode birthdate gender isGoogleAuth tokenVersion").lean();
      if (user && (user.tokenVersion || 0) === (decoded.tv || 0)) {
        return res.json({ success: true, loggedIn: true, role: "user", user: sessionUser(user) });
      }
    }
  } catch { /* expired or invalid token: treat as guest */ }

  clearAuthCookie(res);
  return res.json(guest);
};

//For getting profile data
const getMyProfile = async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    firstName: user.firstName,
    lastName: user.lastName,
    username: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    mobile: user.mobile,
    pincode: user.pincode,
    birthdate: user.birthdate,
    gender: user.gender,
    isGoogleAuth: !!user.isGoogleAuth,
  });
};

//For profile Update
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, mobile, pincode, birthdate, gender } = req.body;
    const update = {};
    const errors = [];

    if (firstName !== undefined) {
      const v = asString(firstName, { max: 50 });
      v ? (update.firstName = v) : errors.push("First name is required");
    }
    if (lastName !== undefined) {
      const v = asString(lastName, { max: 50 });
      v ? (update.lastName = v) : errors.push("Last name is required");
    }
    if (mobile !== undefined && mobile !== null && mobile !== "") {
      /^[6-9]\d{9}$/.test(String(mobile)) ? (update.mobile = Number(mobile)) : errors.push("Mobile number must be 10 digits");
    }
    if (pincode !== undefined && pincode !== null && pincode !== "") {
      /^\d{6}$/.test(String(pincode)) ? (update.pincode = Number(pincode)) : errors.push("Pincode must be 6 digits");
    }
    if (birthdate !== undefined && birthdate !== null && birthdate !== "") {
      const d = new Date(birthdate);
      !Number.isNaN(d.getTime()) && d < new Date() ? (update.birthdate = d) : errors.push("Invalid birth date");
    }
    if (gender !== undefined && gender !== null && gender !== "") {
      typeof gender === "string" && gender.length <= 20 ? (update.gender = gender) : errors.push("Invalid gender");
    }

    if (errors.length) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: errors[0] });
    }

    const updatedUser = await userModel.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
    if (!updatedUser) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Account not found." });
    }

    return res.status(httpStatus.OK).json({ success: true, message: "Profile updated successfully.", user: sessionUser(updatedUser) });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred while updating the profile." });
  }
};

//For deleting the account
const deleteAccount = async (req, res) => {
  try {
    const deletedUser = await userModel.findByIdAndDelete(req.user._id);
    if (!deletedUser) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User account could not be found." });
    }

    clearAuthCookie(res);
    return res.status(httpStatus.OK).json({ success: true, message: "Your account has been permanently deleted." });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred while deleting the account." });
  }
};

//For logout
const logoutUser = (req, res) => {
  clearAuthCookie(res);
  return res.status(httpStatus.OK).json({ success: true, message: "Logged out successfully" });
};

export {
  loginUser, registerUser, verifyEmail, resendOtp, verifyAdmin, getSession,
  withGoogle, getMyProfile, updateProfile, deleteAccount,
  forgotPassword, verifyForgot, resetPassword,
  logoutUser,
};

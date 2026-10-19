import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { clearAuthCookie } from "../utils/security.js";

// Fields controllers read from req.user. Large arrays (coinsHistory, orders,
// cartData) are left out so every authenticated request stays cheap.
const USER_FIELDS = "firstName lastName email mobile pincode birthdate gender isGoogleAuth verified tokenVersion coinsPresent";

export const authUser = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "Please log in to continue" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "user" || !decoded.id) {
            return res.status(401).json({ success: false, message: "Please log in to continue" });
        }

        const user = await User.findById(decoded.id).select(USER_FIELDS);

        // Account deleted, or sessions revoked by a password reset
        if (!user || (user.tokenVersion || 0) !== (decoded.tv || 0)) {
            clearAuthCookie(res);
            return res.status(401).json({ success: false, message: "Your session has expired. Please log in again." });
        }

        req.user = user;
        next();

    } catch {
        return res.status(401).json({ success: false, message: "Your session has expired. Please log in again." });
    }
};

// Like authUser, but lets guests through with req.user unset
export const optionalUser = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return next();
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === "user" && decoded.id) {
            const user = await User.findById(decoded.id).select(USER_FIELDS);
            if (user && (user.tokenVersion || 0) === (decoded.tv || 0)) req.user = user;
        }
    } catch { /* treat as guest */ }
    next();
};

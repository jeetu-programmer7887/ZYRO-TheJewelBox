import jwt from 'jsonwebtoken';

export const authAdmin = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "Please log in to continue" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin" || decoded.sub !== "admin") {
            return res.status(403).json({ success: false, message: "Admin access only" });
        }

        next();
    } catch {
        return res.status(401).json({ success: false, message: "Your session has expired. Please log in again." });
    }
}

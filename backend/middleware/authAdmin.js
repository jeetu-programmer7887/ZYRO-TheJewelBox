import jwt from 'jsonwebtoken';

export const authAdmin = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "User Not Authenticated" });
        }

        const decoded_token = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded_token.id !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            return res.status(403).json({ success: false, message: "Admin access only" });
        }

        next();

    } catch (error) {
        console.log("Admin Authorization Erro", error);
        res.json({ success: false, message: error.message });
    }
}
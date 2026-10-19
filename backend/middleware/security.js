import rateLimit from 'express-rate-limit';

// FRONTEND_URL may hold several comma-separated origins
// (e.g. production + preview domains).
export const allowedOrigins = () =>
    (process.env.FRONTEND_URL || '')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);

// ── CSRF protection ─────────────────────────────────────────
// Session cookies are SameSite=None (the API lives on a different domain
// than the shop), so the browser would attach them to a form posted from
// any website. Browsers always send Origin on cross-site POST/PUT/PATCH/
// DELETE, so state-changing requests from other sites are rejected here.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const originCheck = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.headers.origin;
    if (!origin) {
        // No Origin: not a browser cross-site request (server-to-server,
        // curl, webhooks). These can't carry the customer's cookies.
        return next();
    }
    if (allowedOrigins().includes(origin.replace(/\/$/, ''))) return next();

    return res.status(403).json({ success: false, message: 'Request blocked' });
};

// ── NoSQL operator injection ────────────────────────────────
// Reject request bodies/queries containing keys like "$ne" or "a.b", which
// would otherwise be interpreted as MongoDB operators/paths.
const hasMongoOperator = (value, depth = 0) => {
    if (depth > 10 || value === null || typeof value !== 'object') return false;
    if (Buffer.isBuffer(value)) return false;
    for (const key of Object.keys(value)) {
        if (key.startsWith('$') || key.includes('.')) return true;
        if (hasMongoOperator(value[key], depth + 1)) return true;
    }
    return false;
};

export const rejectMongoOperators = (req, res, next) => {
    if (hasMongoOperator(req.body) || hasMongoOperator(req.query) || hasMongoOperator(req.params)) {
        return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    next();
};

// ── Rate limits ─────────────────────────────────────────────
// Note: on serverless hosts each instance keeps its own counters, so these
// are a first line of defence; per-account OTP attempt limits are enforced
// in the database as well.
const limiter = (windowMs, limit, message) => rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message },
});

// Login, signup, OTP and password-reset endpoints
export const authLimiter = limiter(15 * 60 * 1000, 30, 'Too many attempts. Please wait a few minutes and try again.');
// Endpoints that send emails or call paid AI APIs
export const expensiveLimiter = limiter(60 * 60 * 1000, 20, "You've reached the limit for now. Please try again later.");
// Everything else under /api
export const apiLimiter = limiter(60 * 1000, 300, 'Too many requests. Please slow down.');
// Support chatbot (calls a paid AI API per message)
export const chatLimiter = limiter(15 * 60 * 1000, 40, "You're sending messages too quickly. Please wait a moment.");

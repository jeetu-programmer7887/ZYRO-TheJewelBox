import { Router } from 'express';
import crypto from 'crypto';
import { runOrderStatusJob, runCoinExpiryJob } from '../config/updateStatus.js';

const cronRouter = Router();

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Anything else is rejected.
const requireCronSecret = (req, res, next) => {
    const secret = process.env.CRON_SECRET;
    const header = req.headers.authorization || '';
    const expected = `Bearer ${secret}`;
    if (!secret || header.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected))) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

cronRouter.get('/order-status', requireCronSecret, async (req, res, next) => {
    try {
        res.json({ success: true, ...(await runOrderStatusJob()) });
    } catch (error) {
        next(error);
    }
});

cronRouter.get('/coin-expiry', requireCronSecret, async (req, res, next) => {
    try {
        res.json({ success: true, ...(await runCoinExpiryJob()) });
    } catch (error) {
        next(error);
    }
});

export default cronRouter;

import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import { transitionOrder } from '../services/orderLifecycle.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Auto Status Updates ─────────────────────────────────────
// Moves confirmed orders along Packing → Shipped → Out for delivery →
// Delivered based on order age and the promised delivery date. Uses the
// shared order lifecycle, so delivery coins and emails are handled the same
// way as when an admin changes the status.
export const runOrderStatusJob = async () => {
    const now = new Date();
    const summary = { checked: 0, updated: 0, failed: 0 };

    const activeOrders = await orderModel.find({
        status: { $in: ['Order Placed', 'Packing', 'Shipped', 'Out for delivery'] },
    }).select('_id status createdAt deliveryDate').lean();

    for (const order of activeOrders) {
        summary.checked++;
        const deliveryDate = order.deliveryDate ? new Date(order.deliveryDate) : null;
        const daysSinceOrdered = Math.floor((now - new Date(order.createdAt)) / DAY_MS);
        const isDeliveryDay = deliveryDate && now.toDateString() === deliveryDate.toDateString();
        const isPastDelivery = deliveryDate && now > deliveryDate && !isDeliveryDay;

        let newStatus = order.status;
        if (isPastDelivery) newStatus = 'Delivered';
        else if (isDeliveryDay) newStatus = 'Out for delivery';
        else if (daysSinceOrdered >= 2) newStatus = 'Shipped';
        else if (daysSinceOrdered >= 1) newStatus = 'Packing';

        // Only ever move forward
        const rank = ['Order Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered'];
        if (rank.indexOf(newStatus) <= rank.indexOf(order.status)) continue;

        try {
            await transitionOrder(order._id, newStatus);
            summary.updated++;
        } catch (error) {
            summary.failed++;
            console.error(`Status job: order ${order._id} ${order.status} → ${newStatus} failed:`, error.message);
        }
    }
    return summary;
};

// ── Coin Expiry ─────────────────────────────────────────────
// Coins are spent oldest-first, so the part of a user's balance that is
// still backed by unexpired rewards is protected; only the remainder expires.
export const runCoinExpiryJob = async () => {
    const now = new Date();
    const summary = { users: 0, coinsExpired: 0 };

    const users = await userModel.find({
        coinsHistory: { $elemMatch: { type: 'earned', expiresAt: { $lte: now } } },
    }).select('_id coinsPresent coinsHistory').lean();

    for (const user of users) {
        const history = user.coinsHistory || [];
        const expiredEntries = history.filter(h => h.type === 'earned' && h.expiresAt && new Date(h.expiresAt) <= now);
        if (!expiredEntries.length) continue;

        const stillValid = history
            .filter(h => h.type === 'earned' && h.expiresAt && new Date(h.expiresAt) > now)
            .reduce((sum, h) => sum + h.coins, 0);
        const totalExpired = expiredEntries.reduce((sum, h) => sum + h.coins, 0);
        const coinsToRemove = Math.min(totalExpired, Math.max(0, (user.coinsPresent || 0) - stillValid));

        const update = {
            // Mark the entries processed whether or not any balance remained
            $set: { 'coinsHistory.$[elem].type': 'expired' },
        };
        if (coinsToRemove > 0) {
            update.$inc = { coinsPresent: -coinsToRemove, coinsDeducted: coinsToRemove };
        }
        await userModel.updateOne(
            { _id: user._id },
            update,
            { arrayFilters: [{ 'elem.type': 'earned', 'elem.expiresAt': { $lte: now } }] }
        );
        if (coinsToRemove > 0) {
            await userModel.updateOne({ _id: user._id }, {
                $push: { coinsHistory: { type: 'expired', coins: coinsToRemove, reason: 'Coins expired after 1 month', date: now } },
            });
        }

        summary.users++;
        summary.coinsExpired += coinsToRemove;
    }
    return summary;
};

// Long-running server (local dev, a VM, Render, etc.): schedule in-process.
// On Vercel the same jobs are triggered by Vercel Cron via /api/cron/*.
const startCronJobs = async () => {
    if (process.env.VERCEL) return;
    const { default: cron } = await import('node-cron');

    cron.schedule('0 * * * *', async () => {
        try {
            console.log('Order status job:', await runOrderStatusJob());
        } catch (error) {
            console.error('Status Cron Error:', error.message);
        }
    });

    cron.schedule('*/15 * * * *', async () => {
        try {
            const { reconcileAllPendingOrders } = await import('../services/checkout.js');
            console.log('Pending payments job:', await reconcileAllPendingOrders());
        } catch (error) {
            console.error('Pending Payments Cron Error:', error.message);
        }
    });

    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Coin expiry job:', await runCoinExpiryJob());
        } catch (error) {
            console.error('Coin Expiry Cron Error:', error.message);
        }
    });
};

export default startCronJobs;

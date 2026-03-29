import cron from 'node-cron';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import sendOrderEmail from '../middleware/sendOrderEmail.js';

const startCronJobs = () => {

    // ── Auto Status Updates — runs every hour ──────────────
    cron.schedule('0 * * * *', async () => {
        console.log("--- Checking Automated Status Updates ---");
        try {
            const now = new Date();
            const notifyStatuses = ["Cancelled", "Returned", "Delivered", "Out for delivery"];

            // Fetch active orders (exclude terminal/pending-return statuses)
            const activeOrders = await orderModel.find({
                status: { $nin: ['Delivered', 'Cancelled', 'Returned', 'Return Requested'] }
            });

            for (let order of activeOrders) {
                const orderDate    = new Date(order.createdAt);
                const deliveryDate = new Date(order.deliveryDate);
                const diffInMs     = now - orderDate;
                const daysSinceOrdered = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

                let newStatus      = order.status;
                const isDeliveryDay  = now.toDateString() === deliveryDate.toDateString();
                const isPastDelivery = now > deliveryDate && !isDeliveryDay;

                // --- 1. STATUS DETERMINATION LOGIC ---
                if (isPastDelivery) {
                    newStatus = 'Delivered';
                } else if (isDeliveryDay) {
                    newStatus = 'Out for delivery';
                } else if (daysSinceOrdered >= 2) {
                    newStatus = 'Shipped';
                } else if (daysSinceOrdered >= 1) {
                    newStatus = 'Packing';
                }

                // --- 2. EXECUTE UPDATES & NOTIFICATIONS ---
                if (newStatus !== order.status) {
                    const oldStatus  = order.status;
                    order.status     = newStatus;

                    if (newStatus === 'Delivered') {
                        order.payment      = true;
                        order.deliveryDate = now;
                    }

                    const updatedOrder = await order.save();
                    console.log(`Order ${order._id}: ${oldStatus} → ${newStatus}`);

                    // --- EMAIL NOTIFICATION ---
                    if (notifyStatuses.includes(newStatus)) {
                        try {
                            await sendOrderEmail(updatedOrder.address.email, updatedOrder);
                            console.log(`Notification sent to ${updatedOrder.address.email} for status: ${newStatus}`);
                        } catch (emailError) {
                            console.error(`Email failed for Order ${order._id}, but status was updated:`, emailError.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Status Cron Error:", error.message);
        }
    });

    // ── Coin Expiry Check — runs daily at midnight ─────────
    cron.schedule('0 0 * * *', async () => {
        console.log("--- Checking Coin Expiry ---");
        try {
            const now = new Date();

            // Find users who have expired coins in history
            const users = await userModel.find({
                'coinsHistory.expiresAt': { $lte: now },
                'coinsHistory.type': 'earned'
            });

            for (const user of users) {
                const expiredEntries = user.coinsHistory.filter(h =>
                    h.type === 'earned' &&
                    h.expiresAt &&
                    new Date(h.expiresAt) <= now
                );

                if (expiredEntries.length === 0) continue;

                const totalExpired  = expiredEntries.reduce((sum, h) => sum + h.coins, 0);
                const coinsToRemove = Math.min(totalExpired, user.coinsPresent);

                if (coinsToRemove > 0) {
                    await userModel.findByIdAndUpdate(user._id, {
                        $inc: {
                            coinsPresent:  -coinsToRemove,
                            coinsDeducted:  coinsToRemove
                        },
                        $push: {
                            coinsHistory: {
                                type:   "expired",
                                coins:   coinsToRemove,
                                reason: "Coins expired after 1 month",
                                date:    now
                            }
                        }
                    });

                    // Mark expired entries so they don't expire again
                    await userModel.updateOne(
                        { _id: user._id },
                        { $set: { 'coinsHistory.$[elem].type': 'expired' } },
                        { arrayFilters: [{ 'elem.type': 'earned', 'elem.expiresAt': { $lte: now } }] }
                    );

                    console.log(`Expired ${coinsToRemove} coins for user ${user._id}`);
                }
            }
        } catch (error) {
            console.error("Coin Expiry Cron Error:", error.message);
        }
    });

    // ── Coin Expiry Warning — runs daily at 9am ────────────
    cron.schedule('0 9 * * *', async () => {
        console.log("---  Checking Coin Expiry Warnings ---");
        try {
            const now         = new Date();
            const warningDate = new Date();
            warningDate.setDate(warningDate.getDate() + 7); // 7 days from now

            // Find users with coins expiring in the next 7 days
            const users = await userModel.find({
                'coinsHistory.expiresAt': { $gte: now, $lte: warningDate },
                'coinsHistory.type': 'earned'
            }).select('_id email firstName coinsHistory');

            for (const user of users) {
                const expiringSoon = user.coinsHistory.filter(h =>
                    h.type     === 'earned' &&
                    h.expiresAt &&
                    new Date(h.expiresAt) >= now &&
                    new Date(h.expiresAt) <= warningDate
                );

                if (expiringSoon.length === 0) continue;

                const totalExpiring = expiringSoon.reduce((sum, h) => sum + h.coins, 0);
                console.log(`⚠️  User ${user.firstName} has ${totalExpiring} coins expiring soon`);
            }
        } catch (error) {
            console.error("Expiry Warning Cron Error:", error.message);
        }
    });
};

export default startCronJobs;
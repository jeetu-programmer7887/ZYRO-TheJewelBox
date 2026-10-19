import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import sendOrderEmail from "../middleware/sendOrderEmail.js";
import { refundPayment, toPaise, describeGatewayError } from "./payments.js";

// Which status an order may move to from each status. Anything else is
// rejected, so e.g. a delivered order can't be "cancelled" and restocked.
export const ORDER_TRANSITIONS = {
  // Pending Payment → Order Placed happens only through a verified payment
  "Pending Payment": ["Cancelled"],
  "Order Placed": ["Packing", "Shipped", "Out for delivery", "Delivered", "Cancelled"],
  "Packing": ["Shipped", "Out for delivery", "Delivered", "Cancelled"],
  "Shipped": ["Out for delivery", "Delivered"],
  "Out for delivery": ["Delivered"],
  "Delivered": ["Return Requested"],
  "Return Requested": ["Returned", "Delivered"], // Delivered = return rejected
  "Cancelled": [],
  "Returned": [],
};

// Statuses a customer can still cancel from themselves
export const CUSTOMER_CANCELLABLE = ["Pending Payment", "Order Placed", "Packing"];

const NOTIFY_STATUSES = ["Cancelled", "Returned", "Delivered", "Out for delivery", "Shipped"];
export const RETURN_WINDOW_DAYS = 7;

const COIN_EXPIRY_MONTHS = 1;
const randomDeliveryCoins = () => Math.floor(Math.random() * 6) + 5;

export class OrderTransitionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Orders created before the payment rework don't have the bookkeeping
// flags; for those, stock/coins were taken for COD orders and paid orders.
const isLegacy = (order) => order.paymentStatus === undefined;
const stockWasTaken = (order) =>
  order.stockCommitted === true || (isLegacy(order) && (order.paymentMethod === "COD" || order.payment === true));
const coinsWereTaken = (order) =>
  order.coinsDebited === true || (isLegacy(order) && (order.paymentMethod === "COD" || order.payment === true));
const wasPaidOnline = (order) => order.paymentMethod === "Razorpay" && order.payment === true;

// Atomic per-item restock ($inc), safe under concurrent requests.
export const restockItems = async (items) => {
  await Promise.all(items.map(async (item) => {
    if (!item.productId || !(item.quantity > 0)) return;
    // Put stock back into exactly the variants it was taken from
    if (item.allocations?.length) {
      await Promise.all(item.allocations.map((a) => productModel.updateOne(
        { _id: item.productId, "variants.sku": a.sku },
        { $inc: { "variants.$.stock": a.quantity } }
      )));
      return;
    }
    if (item.variantSku && item.variantSku !== "Standard") {
      const res = await productModel.updateOne(
        { _id: item.productId, "variants.sku": item.variantSku },
        { $inc: { "variants.$.stock": item.quantity } }
      );
      if (res.matchedCount) return;
    }
    // "Standard" items are taken from the first variant
    await productModel.updateOne(
      { _id: item.productId, "variants.0": { $exists: true } },
      { $inc: { "variants.0.stock": item.quantity } }
    );
  }));
};

export const creditCoins = async (userId, coins, reason, orderId, { expires = false } = {}) => {
  if (!(coins > 0)) return;
  const entry = { type: "earned", coins, reason, orderId };
  if (expires) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + COIN_EXPIRY_MONTHS);
    entry.expiresAt = expiresAt;
  }
  const inc = { coinsPresent: coins };
  if (expires) inc.coinsEarned = coins; // lifetime "earned" counts rewards only
  await userModel.updateOne({ _id: userId }, { $inc: inc, $push: { coinsHistory: entry } });
};

export const debitCoins = async (userId, coins, reason, orderId) => {
  if (!(coins > 0)) return 0;
  // Never take the balance below zero
  const user = await userModel.findById(userId).select("coinsPresent").lean();
  const amount = Math.min(coins, Math.max(0, user?.coinsPresent || 0));
  if (amount <= 0) return 0;
  await userModel.updateOne(
    { _id: userId },
    {
      $inc: { coinsPresent: -amount, coinsDeducted: amount },
      $push: { coinsHistory: { type: "deducted", coins: amount, reason, orderId } },
    }
  );
  return amount;
};

// Award delivery coins exactly once per order (atomic claim on coinsAwarded)
const awardDeliveryCoins = async (order) => {
  const coins = randomDeliveryCoins();
  const claimed = await orderModel.findOneAndUpdate(
    { _id: order._id, coinsAwarded: { $ne: true } },
    { $set: { coinsAwarded: true, coinsEarned: coins } },
    { new: true }
  );
  if (!claimed) return 0;
  await creditCoins(order.userId, coins, "Earned for delivered order", order._id, { expires: true });
  return coins;
};

// Take back reward coins for a returned order, and stop that reward
// entry from "expiring" later (which would deduct the same coins twice).
const reverseDeliveryCoins = async (order) => {
  if (!order.coinsAwarded || !(order.coinsEarned > 0)) return;
  await debitCoins(order.userId, order.coinsEarned, "Coins reversed for returned order", order._id);
  await userModel.updateOne(
    { _id: order.userId },
    { $unset: { "coinsHistory.$[e].expiresAt": "" } },
    { arrayFilters: [{ "e.orderId": order._id, "e.type": "earned" }] }
  );
};

/**
 * Refund an online payment in full through Razorpay. Safe to call more than
 * once: the refund is claimed atomically and a failed refund can be retried.
 * Never throws; the outcome is recorded on the order.
 */
export const refundOrder = async (orderId, reason = "Order cancelled") => {
  const claimed = await orderModel.findOneAndUpdate(
    {
      _id: orderId,
      paymentMethod: "Razorpay",
      payment: true,
      razorpayPaymentId: { $type: "string" },
      refundStatus: { $in: ["none", "failed", null] },
    },
    { $set: { refundStatus: "pending", refundError: null } },
    { new: true }
  );
  if (!claimed) return orderModel.findById(orderId);

  try {
    const refund = await refundPayment(claimed.razorpayPaymentId, {
      amountPaise: toPaise(claimed.amount),
      receipt: `refund_${claimed._id}`,
      notes: { orderId: String(claimed._id), reason: String(reason).slice(0, 200) },
    });
    const processed = refund.status === "processed";
    return orderModel.findByIdAndUpdate(claimed._id, {
      $set: {
        refundId: refund.id,
        refundAmount: (refund.amount || toPaise(claimed.amount)) / 100,
        refundStatus: processed ? "processed" : "pending",
        ...(processed ? { refundedAt: new Date(), paymentStatus: "refunded" } : {}),
      },
    }, { new: true });
  } catch (error) {
    const message = describeGatewayError(error);
    console.error(`Refund failed for order ${claimed._id}:`, message);
    // Already refunded on Razorpay's side (e.g. from the dashboard)
    if (/fully refunded|already been refunded/i.test(message)) {
      return orderModel.findByIdAndUpdate(claimed._id, {
        $set: { refundStatus: "processed", refundedAt: new Date(), paymentStatus: "refunded", refundAmount: claimed.amount },
      }, { new: true });
    }
    return orderModel.findByIdAndUpdate(claimed._id, {
      $set: { refundStatus: "failed", refundError: message.slice(0, 300) },
    }, { new: true });
  }
};

/**
 * Move an order to `toStatus`, applying side effects exactly once.
 * The status change is claimed atomically (findOneAndUpdate on the current
 * status), so two concurrent requests can never both restock or refund.
 *
 * options.allowedFrom: restrict the source statuses (e.g. customer cancel)
 * options.notify: send the status email (default true)
 * options.extra: extra fields to set with the status (e.g. returnReason)
 */
export const transitionOrder = async (orderId, toStatus, { allowedFrom, notify = true, extra = {}, userId } = {}) => {
  if (!Object.prototype.hasOwnProperty.call(ORDER_TRANSITIONS, toStatus)) {
    throw new OrderTransitionError("Invalid order status");
  }

  const filter = { _id: orderId };
  if (userId) filter.userId = userId;
  const current = await orderModel.findOne(filter).lean();
  if (!current) throw new OrderTransitionError("Order not found", 404);

  if (current.status === toStatus) {
    throw new OrderTransitionError(`Order is already ${toStatus.toLowerCase()}`);
  }
  const allowed = ORDER_TRANSITIONS[current.status] || [];
  if (!allowed.includes(toStatus) || (allowedFrom && !allowedFrom.includes(current.status))) {
    throw new OrderTransitionError(`An order that is "${current.status}" can't be changed to "${toStatus}"`);
  }

  const set = { status: toStatus, ...extra };
  if (toStatus === "Delivered" && current.status !== "Return Requested") {
    set.deliveryDate = new Date();
    if (current.paymentMethod === "COD") {
      set.payment = true; // cash collected on delivery
      set.paymentStatus = "cod_collected";
    }
  }
  if (toStatus === "Cancelled" && current.status === "Pending Payment" && !extra.paymentStatus) {
    set.paymentStatus = "expired";
  }
  if (toStatus === "Returned" && current.paymentMethod === "COD" && current.payment === true) {
    set.refundStatus = "manual"; // cash orders are refunded offline by the store
  }

  const updated = await orderModel.findOneAndUpdate(
    { _id: current._id, status: current.status },
    { $set: set },
    { new: true, runValidators: true }
  );
  if (!updated) {
    throw new OrderTransitionError("This order was just updated by someone else. Please refresh and try again.", 409);
  }

  // ── Side effects (run once: only the request that won the claim gets here)
  if (toStatus === "Cancelled") {
    if (stockWasTaken(current)) await restockItems(current.items);
    if (coinsWereTaken(current) && current.coinsRedeemed > 0) {
      await creditCoins(current.userId, current.coinsRedeemed, "Coins returned for cancelled order", current._id);
    }
    if (wasPaidOnline(current)) await refundOrder(current._id, extra.cancelReason || "Order cancelled");
  }

  if (toStatus === "Returned") {
    if (stockWasTaken(current)) await restockItems(current.items);
    await reverseDeliveryCoins(current);
    if (coinsWereTaken(current) && current.coinsRedeemed > 0) {
      await creditCoins(current.userId, current.coinsRedeemed, "Coins returned for returned order", current._id);
    }
    if (wasPaidOnline(current)) await refundOrder(current._id, "Order returned");
  }

  if (toStatus === "Delivered" && current.status !== "Return Requested") {
    await awardDeliveryCoins(current);
  }

  if (notify && NOTIFY_STATUSES.includes(toStatus)) {
    try {
      await sendOrderEmail(updated.address?.email, updated);
    } catch (emailError) {
      console.error(`Status email failed for order ${updated._id}:`, emailError.message);
    }
  }

  return orderModel.findById(updated._id);
};

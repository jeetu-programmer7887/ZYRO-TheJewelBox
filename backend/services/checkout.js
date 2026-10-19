import mongoose from "mongoose";
import axios from "axios";
import validator from "validator";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import sendOrderEmail from "../middleware/sendOrderEmail.js";
import {
  transitionOrder, refundOrder, creditCoins, OrderTransitionError,
  CUSTOMER_CANCELLABLE, RETURN_WINDOW_DAYS,
} from "./orderLifecycle.js";
import {
  createGatewayOrder, fetchPayment, fetchOrderPayments, capturePayment,
  refundPayment, toPaise, razorpayKeyId, describeGatewayError,
} from "./payments.js";

// ── Store rules (single source of truth; the frontend only displays them) ──
export const PRICING_RULES = {
  deliveryFee: 50,
  freeDeliveryThreshold: 500,
  coinValue: 5,                 // 1 coin = ₹5
  maxCoinDiscountRatio: 0.10,   // coins can cover at most 10% of the order
  maxQuantityPerItem: 10,
  deliveryDays: 5,
  deliveryLabel: "3–5 business days",
};
const PAYMENT_WINDOW_MS = 30 * 60 * 1000; // unpaid online orders expire after 30 minutes
const DAY_MS = 24 * 60 * 60 * 1000;

export class CheckoutError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
class OutOfStockError extends CheckoutError {
  constructor(title) {
    super(`"${title}" just sold out. Please review your bag.`, 409, { code: "OUT_OF_STOCK" });
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
const isObjectId = (id) => typeof id === "string" && /^[0-9a-f]{24}$/i.test(id);
const totalStock = (product) => (product.variants || []).reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0);

// ── Transactions ─────────────────────────────────────────────
// Atlas supports multi-document transactions, so stock, coins and the order
// are written all-or-nothing. A standalone local mongod doesn't; there we
// fall back to running without a session (with manual stock rollback).
const transactionsUnsupported = (error) =>
  error?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(error?.message || "");

export const withTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (error) {
    if (transactionsUnsupported(error)) return fn(null);
    throw error;
  } finally {
    await session.endSession();
  }
};

const withSession = (query, session) => (session ? query.session(session) : query);

// ── Quote ────────────────────────────────────────────────────
/**
 * Price the customer's server-side cart from current database prices.
 * Nothing about price, stock or discount is taken from the browser.
 */
export const buildQuote = async (userId, { useCoins = false } = {}, session = null) => {
  const user = await withSession(userModel.findById(userId).select("cartData coinsPresent"), session).lean();
  if (!user) throw new CheckoutError("Account not found", 404);

  const cart = user.cartData || {};
  const ids = Object.keys(cart).filter((id) => isObjectId(id) && Number(cart[id]) > 0);
  const products = ids.length
    ? await withSession(productModel.find({ _id: { $in: ids } })
        .select("title slug price comparePrice thumbnail images variants isActive material"), session).lean()
    : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  const issues = [];
  for (const id of ids) {
    const product = byId.get(id);
    const quantity = Math.floor(Number(cart[id]));
    if (!product || product.isActive === false) {
      issues.push({ productId: id, type: "unavailable", message: "An item in your bag is no longer available. Please remove it." });
      continue;
    }
    const available = totalStock(product);
    const maxQuantity = Math.min(available, PRICING_RULES.maxQuantityPerItem);
    if (available <= 0) {
      issues.push({ productId: id, type: "out_of_stock", message: `"${product.title}" is out of stock.` });
    } else if (quantity > maxQuantity) {
      issues.push({
        productId: id,
        type: "insufficient_stock",
        available: maxQuantity,
        message: quantity > available
          ? `Only ${available} of "${product.title}" left in stock.`
          : `You can buy up to ${PRICING_RULES.maxQuantityPerItem} of "${product.title}".`,
      });
    }
    lines.push({
      productId: id,
      title: product.title,
      slug: product.slug,
      material: product.material || null,
      image: product.thumbnail || product.images?.[0] || "",
      price: product.price,
      comparePrice: product.comparePrice > product.price ? product.comparePrice : null,
      quantity,
      lineTotal: round2(product.price * quantity),
      availableStock: available,
      maxQuantity,
    });
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const deliveryFee = subtotal > 0 && subtotal < PRICING_RULES.freeDeliveryThreshold ? PRICING_RULES.deliveryFee : 0;
  const baseTotal = round2(subtotal + deliveryFee);

  const coinsAvailable = Math.max(0, user.coinsPresent || 0);
  const maxCoinsForOrder = Math.floor(Math.floor(baseTotal * PRICING_RULES.maxCoinDiscountRatio) / PRICING_RULES.coinValue);
  const maxUsable = Math.min(coinsAvailable, maxCoinsForOrder);
  const coinsUsed = useCoins ? maxUsable : 0;
  const coinDiscount = coinsUsed * PRICING_RULES.coinValue;
  const total = lines.length ? Math.max(1, round2(baseTotal - coinDiscount)) : 0;

  return {
    lines,
    issues,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    canCheckout: lines.length > 0 && issues.length === 0,
    subtotal,
    deliveryFee,
    freeDeliveryThreshold: PRICING_RULES.freeDeliveryThreshold,
    amountToFreeDelivery: deliveryFee > 0 ? round2(PRICING_RULES.freeDeliveryThreshold - subtotal) : 0,
    coins: {
      available: coinsAvailable,
      maxUsable,
      used: coinsUsed,
      valuePerCoin: PRICING_RULES.coinValue,
      discount: coinDiscount,
    },
    total,
    currency: "INR",
    delivery: { days: PRICING_RULES.deliveryDays, label: PRICING_RULES.deliveryLabel },
    paymentMethods: [
      { id: "COD", label: "Cash on Delivery", enabled: true },
      { id: "Razorpay", label: "Online Payment (UPI, Cards, NetBanking)", enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) },
    ],
  };
};

// ── Pincode lookup (India Post) ──────────────────────────────
const pincodeCache = new Map();
export const lookupPincode = async (pincode) => {
  if (!/^[1-9]\d{5}$/.test(pincode)) return { valid: false };
  const cached = pincodeCache.get(pincode);
  if (cached && Date.now() - cached.at < DAY_MS) return cached.value;

  const { data } = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, { timeout: 5000 });
  const entry = Array.isArray(data) ? data[0] : null;
  const office = entry?.Status === "Success" ? entry.PostOffice?.[0] : null;
  const value = office
    ? { valid: true, serviceable: true, city: office.District, state: office.State }
    : { valid: true, serviceable: false };
  if (pincodeCache.size > 5000) pincodeCache.clear();
  pincodeCache.set(pincode, { at: Date.now(), value });
  return value;
};

// ── Address ──────────────────────────────────────────────────
const clean = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export const validateAddress = async (raw) => {
  if (!raw || typeof raw !== "object") throw new CheckoutError("Please enter your delivery address");
  const address = {
    firstName: clean(raw.firstName, 50),
    lastName: clean(raw.lastName, 50),
    email: clean(raw.email, 120).toLowerCase(),
    mobile: clean(String(raw.mobile ?? ""), 10),
    flatHouse: clean(raw.flatHouse, 150),
    areaStreet: clean(raw.areaStreet, 150),
    pincode: clean(String(raw.pincode ?? ""), 6),
    city: clean(raw.city, 80),
    state: clean(raw.state, 80),
    addressType: ["Home", "Work", "Other"].includes(raw.addressType) ? raw.addressType : "Home",
  };

  if (!address.firstName || !address.lastName) throw new CheckoutError("Please enter your first and last name");
  if (!validator.isEmail(address.email)) throw new CheckoutError("Please enter a valid email address");
  if (!/^[6-9]\d{9}$/.test(address.mobile)) throw new CheckoutError("Please enter a valid 10-digit mobile number");
  if (!address.flatHouse || !address.areaStreet) throw new CheckoutError("Please enter your house and street details");
  if (!/^[1-9]\d{5}$/.test(address.pincode)) throw new CheckoutError("Please enter a valid 6-digit pincode");

  // City/State come from the pincode, not from what the browser sent.
  // If the lookup service is down, accept the submitted values rather than
  // blocking the sale.
  try {
    const result = await lookupPincode(address.pincode);
    if (result.valid && result.serviceable === false) {
      throw new CheckoutError("Sorry, we don't deliver to this pincode yet");
    }
    if (result.serviceable) {
      address.city = result.city;
      address.state = result.state;
    }
  } catch (error) {
    if (error instanceof CheckoutError) throw error;
    console.warn("Pincode lookup unavailable:", error.message);
  }
  if (!address.city || !address.state) throw new CheckoutError("Please enter a valid pincode so we can find your city");
  return address;
};

// ── Stock ────────────────────────────────────────────────────
/**
 * Take stock for every order line, atomically per variant (stock >= qty
 * guard). "Standard" lines are filled from the variants that have stock,
 * and the allocation is recorded so it can be returned exactly.
 */
const takeStock = async (items, session) => {
  const taken = []; // for manual rollback when running without a transaction
  try {
    const allocationsByItem = [];
    for (const item of items) {
      const product = await withSession(productModel.findById(item.productId).select("title variants isActive"), session).lean();
      if (!product || product.isActive === false) throw new OutOfStockError(item.title);

      const candidates = item.variantSku && item.variantSku !== "Standard"
        ? product.variants.filter((v) => v.sku === item.variantSku)
        : product.variants;

      let remaining = item.quantity;
      const allocations = [];
      for (const variant of candidates) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Math.max(0, variant.stock || 0));
        if (take <= 0) continue;
        const res = await productModel.updateOne(
          { _id: item.productId, variants: { $elemMatch: { sku: variant.sku, stock: { $gte: take } } } },
          { $inc: { "variants.$.stock": -take } },
          session ? { session } : {}
        );
        if (res.modifiedCount !== 1) throw new OutOfStockError(item.title);
        taken.push({ productId: item.productId, sku: variant.sku, quantity: take });
        allocations.push({ sku: variant.sku, quantity: take });
        remaining -= take;
      }
      if (remaining > 0) throw new OutOfStockError(item.title);
      allocationsByItem.push(allocations);
    }
    return allocationsByItem;
  } catch (error) {
    if (!session) {
      await Promise.all(taken.map((t) => productModel.updateOne(
        { _id: t.productId, "variants.sku": t.sku },
        { $inc: { "variants.$.stock": t.quantity } }
      )));
    }
    throw error;
  }
};

const debitCoinsForOrder = async (userId, coins, orderId, session) => {
  if (!(coins > 0)) return;
  const res = await userModel.updateOne(
    { _id: userId, coinsPresent: { $gte: coins } },
    {
      $inc: { coinsPresent: -coins, coinsDeducted: coins },
      $push: { coinsHistory: { type: "deducted", coins, reason: "Redeemed at checkout", orderId } },
    },
    session ? { session } : {}
  );
  if (res.modifiedCount !== 1) {
    throw new CheckoutError("Your coin balance changed. Please review your order.", 409, { code: "COINS_CHANGED" });
  }
};

const removeFromCart = (userId, items, session) => {
  const unset = Object.fromEntries(items.map((i) => [`cartData.${i.productId}`, ""]));
  return userModel.updateOne({ _id: userId }, { $unset: unset }, session ? { session } : {});
};

const sendEmailSafely = async (order) => {
  try {
    await sendOrderEmail(order.address?.email, order);
  } catch (error) {
    console.error(`Order email failed for ${order._id}:`, error.message);
  }
};

// ── Views ────────────────────────────────────────────────────
const derivePaymentStatus = (order) => {
  if (order.paymentStatus) return order.paymentStatus;
  if (order.paymentMethod === "COD") return order.payment ? "cod_collected" : "cod_pending";
  return order.payment ? "captured" : "created";
};

const PAYMENT_LABELS = {
  cod_pending: "Pay on delivery",
  cod_collected: "Paid (cash on delivery)",
  created: "Awaiting payment",
  failed: "Payment failed",
  captured: "Paid online",
  expired: "Payment not completed",
  refunded: "Refunded",
};
const REFUND_LABELS = {
  pending: "Refund initiated. It usually reaches your account in 5–7 business days.",
  processed: "Refund completed",
  failed: "Refund is being retried by our team",
  manual: "Refund will be processed by our team",
};

/** Everything the "My Orders" screens need, decided by the server. */
export const toOrderView = (order) => {
  const now = Date.now();
  const status = order.status;
  const paymentStatus = derivePaymentStatus(order);
  const deliveredAt = order.deliveryDate ? new Date(order.deliveryDate).getTime() : null;
  const returnWindowEndsAt = status === "Delivered" && deliveredAt ? new Date(deliveredAt + RETURN_WINDOW_DAYS * DAY_MS) : null;
  const paymentOpen = status === "Pending Payment" && order.paymentMethod === "Razorpay" &&
    (!order.paymentExpiresAt || new Date(order.paymentExpiresAt).getTime() > now);

  return {
    _id: order._id,
    createdAt: order.createdAt,
    status,
    items: (order.items || []).map((i) => ({
      productId: i.productId,
      title: i.title,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
      lineTotal: round2(i.price * i.quantity),
    })),
    pricing: {
      subtotal: order.subtotal ?? round2((order.items || []).reduce((s, i) => s + i.price * i.quantity, 0)),
      deliveryFee: order.deliveryFee ?? 0,
      coinDiscount: order.coinDiscount ?? (order.coinsRedeemed || 0) * PRICING_RULES.coinValue,
      total: order.amount,
    },
    amount: order.amount,
    address: order.address,
    deliveryDate: order.deliveryDate,
    paymentMethod: order.paymentMethod,
    payment: order.payment,
    paymentStatus,
    paymentLabel: PAYMENT_LABELS[paymentStatus] || paymentStatus,
    paymentExpiresAt: paymentOpen ? order.paymentExpiresAt : null,
    refundStatus: order.refundStatus || "none",
    refundLabel: REFUND_LABELS[order.refundStatus] || null,
    refundAmount: order.refundAmount || 0,
    cancelReason: order.cancelReason || null,
    returnReason: order.returnReason || null,
    coinsRedeemed: order.coinsRedeemed || 0,
    coinsEarned: order.coinsEarned || 0,
    coinsAwarded: !!order.coinsAwarded,
    returnWindowEndsAt,
    actions: {
      canCancel: CUSTOMER_CANCELLABLE.includes(status),
      canPay: paymentOpen,
      canReturn: !!returnWindowEndsAt && now <= returnWindowEndsAt.getTime(),
      canReview: status === "Delivered",
    },
  };
};

const checkoutPayload = (order, user) => ({
  orderId: order._id,
  razorpayOrderId: order.razorpayOrderId,
  keyId: razorpayKeyId(),
  amount: toPaise(order.amount),
  currency: "INR",
  name: "ZYRO Fashion Jewellery",
  description: `Order #${String(order._id).slice(-8).toUpperCase()}`,
  expiresAt: order.paymentExpiresAt,
  prefill: {
    name: `${order.address?.firstName || user?.firstName || ""} ${order.address?.lastName || user?.lastName || ""}`.trim(),
    email: order.address?.email || user?.email || "",
    contact: order.address?.mobile ? `+91${order.address.mobile}` : "",
  },
});

// ── Placing orders ───────────────────────────────────────────
/**
 * Create an order from the customer's server-side cart.
 * COD: stock + coins are taken and the cart cleared in one transaction.
 * Razorpay: coins are reserved now (returned if payment never completes);
 * stock is taken when the payment is confirmed.
 */
export const placeOrder = async (user, { address: rawAddress, paymentMethod, useCoins, idempotencyKey, expectedTotal }) => {
  if (!["COD", "Razorpay"].includes(paymentMethod)) throw new CheckoutError("Please choose a payment method");
  if (typeof idempotencyKey !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(idempotencyKey)) {
    throw new CheckoutError("Invalid checkout session. Please refresh and try again.");
  }

  // A retried request (double click, flaky network) gets the same order back
  const existing = await orderModel.findOne({ userId: user._id, idempotencyKey });
  if (existing) return resumeExistingOrder(existing, user);

  // Release this customer's abandoned online orders first (returns reserved coins)
  await reconcileUserPendingOrders(user._id);

  const address = await validateAddress(rawAddress);

  let order;
  try {
    order = await withTransaction(async (session) => {
      const quote = await buildQuote(user._id, { useCoins: !!useCoins }, session);
      if (!quote.canCheckout) {
        throw new CheckoutError(quote.issues[0]?.message || "Your bag is empty", 409, { code: "CART_CHANGED", quote });
      }
      if (expectedTotal !== undefined && expectedTotal !== null && Math.abs(Number(expectedTotal) - quote.total) > 0.009) {
        throw new CheckoutError("Prices in your bag have changed. Please review the updated total.", 409, { code: "PRICE_CHANGED", quote });
      }
      if (paymentMethod === "Razorpay" && !quote.paymentMethods.find((m) => m.id === "Razorpay")?.enabled) {
        throw new CheckoutError("Online payment is unavailable right now. Please choose Cash on Delivery.", 503);
      }

      const doc = new orderModel({
        userId: user._id,
        items: quote.lines.map((l) => ({
          productId: l.productId,
          title: l.title,
          price: l.price,
          quantity: l.quantity,
          image: l.image,
          variantSku: "Standard",
        })),
        subtotal: quote.subtotal,
        deliveryFee: quote.deliveryFee,
        coinDiscount: quote.coins.discount,
        coinsRedeemed: quote.coins.used,
        amount: quote.total,
        address,
        deliveryDate: new Date(Date.now() + PRICING_RULES.deliveryDays * DAY_MS),
        paymentMethod,
        idempotencyKey,
      });

      if (paymentMethod === "COD") {
        const allocations = await takeStock(doc.items, session);
        doc.items.forEach((item, i) => { item.allocations = allocations[i]; });
        doc.stockCommitted = true;
        doc.status = "Order Placed";
        doc.paymentStatus = "cod_pending";
      } else {
        doc.status = "Pending Payment";
        doc.paymentStatus = "created";
        doc.paymentExpiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
      }

      if (quote.coins.used > 0) {
        await debitCoinsForOrder(user._id, quote.coins.used, doc._id, session);
        doc.coinsDebited = true;
      }

      await doc.save(session ? { session } : {});
      if (paymentMethod === "COD") await removeFromCart(user._id, doc.items, session);
      return doc;
    });
  } catch (error) {
    if (error?.code === 11000 && /idempotencyKey/.test(error.message)) {
      const dup = await orderModel.findOne({ userId: user._id, idempotencyKey });
      if (dup) return resumeExistingOrder(dup, user);
    }
    throw error;
  }

  await userModel.updateOne({ _id: user._id }, { $addToSet: { orders: order._id } });

  if (paymentMethod === "COD") {
    await sendEmailSafely(order);
    return { order: toOrderView(order) };
  }

  return startGatewayPayment(order, user);
};

// Create (or reuse) the Razorpay order for a pending order
const startGatewayPayment = async (order, user) => {
  if (!order.razorpayOrderId) {
    try {
      const gatewayOrder = await createGatewayOrder({
        amountPaise: toPaise(order.amount),
        receipt: String(order._id),
        notes: { orderId: String(order._id), userId: String(order.userId) },
      });
      order = await orderModel.findOneAndUpdate(
        { _id: order._id, razorpayOrderId: { $exists: false } },
        { $set: { razorpayOrderId: gatewayOrder.id } },
        { new: true }
      ) || await orderModel.findById(order._id);
    } catch (error) {
      console.error(`Razorpay order creation failed for ${order._id}:`, describeGatewayError(error));
      // Don't leave the customer's coins locked in an order they can't pay for
      await transitionOrder(order._id, "Cancelled", {
        allowedFrom: ["Pending Payment"],
        notify: false,
        extra: { paymentStatus: "failed", cancelReason: "Payment could not be started" },
      }).catch(() => {});
      throw new CheckoutError("We couldn't start the payment. Please try again or choose Cash on Delivery.", 502);
    }
  }
  return { order: toOrderView(order), checkout: checkoutPayload(order, user) };
};

const resumeExistingOrder = async (order, user) => {
  if (order.status === "Pending Payment" && order.paymentMethod === "Razorpay") {
    if (order.paymentExpiresAt && order.paymentExpiresAt.getTime() < Date.now()) {
      await reconcilePendingOrder(order);
      const latest = await orderModel.findById(order._id);
      return { order: toOrderView(latest) };
    }
    return startGatewayPayment(order, user);
  }
  return { order: toOrderView(order) };
};

/** "Pay now" from My Orders for an order still awaiting payment. */
export const resumePayment = async (user, orderId) => {
  const order = await orderModel.findOne({ _id: orderId, userId: user._id });
  if (!order) throw new CheckoutError("Order not found", 404);
  if (order.status !== "Pending Payment" || order.paymentMethod !== "Razorpay") {
    throw new CheckoutError("This order doesn't need payment", 409, { order: toOrderView(order) });
  }
  if (order.paymentExpiresAt && order.paymentExpiresAt.getTime() < Date.now()) {
    await reconcilePendingOrder(order);
    const latest = await orderModel.findById(order._id);
    throw new CheckoutError(
      latest.payment ? "This order has already been paid." : "The payment window for this order has closed. Please place a new order.",
      409,
      { order: toOrderView(latest) }
    );
  }
  return startGatewayPayment(order, user);
};

// ── Confirming payments ──────────────────────────────────────
/**
 * Confirm a Razorpay payment for one of our orders. Called from the checkout
 * callback, the webhook and reconciliation; safe to run any number of times
 * and concurrently: only one call can move the order to paid.
 */
export const finalizeRazorpayPayment = async ({ razorpayOrderId, paymentId }) => {
  const order = await orderModel.findOne({ razorpayOrderId });
  if (!order) throw new CheckoutError("Order not found for this payment", 404);

  if (order.payment && order.razorpayPaymentId === paymentId) return { order, outcome: "already_paid" };

  let payment = await fetchPayment(paymentId);
  if (payment.order_id !== razorpayOrderId) {
    throw new CheckoutError("This payment does not belong to this order", 400);
  }
  if (payment.currency !== "INR" || Number(payment.amount) !== toPaise(order.amount)) {
    console.error(`Amount mismatch on order ${order._id}: paid ${payment.amount} ${payment.currency}, expected ${toPaise(order.amount)} INR`);
    if (payment.status === "captured") {
      await refundPayment(paymentId, { amountPaise: payment.amount, receipt: `mismatch_${order._id}`, notes: { orderId: String(order._id) } })
        .catch((e) => console.error("Mismatch refund failed:", describeGatewayError(e)));
    }
    throw new CheckoutError("Payment amount did not match the order. Any amount charged will be refunded.", 400);
  }

  if (payment.status === "authorized") {
    try {
      payment = await capturePayment(paymentId, payment.amount);
    } catch (error) {
      payment = await fetchPayment(paymentId); // may already have been auto-captured
    }
  }
  if (payment.status === "failed") {
    await orderModel.updateOne(
      { _id: order._id, payment: false, status: "Pending Payment" },
      { $set: { paymentStatus: "failed", paymentFailureReason: payment.error_description || "Payment failed" } }
    );
    throw new CheckoutError(payment.error_description || "The payment failed. You can try again.", 402);
  }
  if (payment.status !== "captured") {
    throw new CheckoutError("Your payment is still being processed. We'll update your order as soon as it completes.", 409, { code: "PAYMENT_PENDING" });
  }

  // A second successful payment for an order that is already paid: refund it
  if (order.payment && order.razorpayPaymentId && order.razorpayPaymentId !== paymentId) {
    await refundPayment(paymentId, { amountPaise: payment.amount, receipt: `dup_${order._id}`, notes: { orderId: String(order._id), reason: "Duplicate payment" } })
      .catch((e) => console.error("Duplicate payment refund failed:", describeGatewayError(e)));
    return { order, outcome: "duplicate_refunded" };
  }

  // Paid after the order was cancelled/expired: record the payment, refund it
  if (order.status === "Cancelled") {
    const claimed = await orderModel.findOneAndUpdate(
      { _id: order._id, payment: false },
      { $set: { payment: true, paymentStatus: "captured", razorpayPaymentId: paymentId, paidAt: new Date() } },
      { new: true }
    );
    if (claimed) await refundOrder(claimed._id, "Payment received after the order was cancelled");
    return { order: await orderModel.findById(order._id), outcome: "refunded_cancelled" };
  }

  let paidOrder;
  try {
    paidOrder = await withTransaction(async (session) => {
      const fresh = await withSession(orderModel.findOne({ _id: order._id, payment: false, status: "Pending Payment" }), session);
      if (!fresh) return null; // another request already confirmed it

      const allocations = await takeStock(fresh.items, session);
      fresh.items.forEach((item, i) => { item.allocations = allocations[i]; });
      fresh.stockCommitted = true;
      fresh.payment = true;
      fresh.paymentStatus = "captured";
      fresh.razorpayPaymentId = paymentId;
      fresh.paidAt = new Date();
      fresh.paymentFailureReason = null;
      fresh.status = "Order Placed";
      fresh.paymentExpiresAt = undefined;
      fresh.expireAt = undefined;
      await fresh.save(session ? { session } : {});
      await removeFromCart(fresh.userId, fresh.items, session);
      return fresh;
    });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      // Paid, but an item sold out meanwhile: cancel, refund, return coins
      const claimed = await orderModel.findOneAndUpdate(
        { _id: order._id, payment: false, status: "Pending Payment" },
        {
          $set: {
            payment: true, paymentStatus: "captured", razorpayPaymentId: paymentId, paidAt: new Date(),
            status: "Cancelled", cancelReason: "An item sold out while you were paying. Your payment has been refunded.",
          },
        },
        { new: true }
      );
      if (claimed) {
        if (claimed.coinsDebited && claimed.coinsRedeemed > 0) {
          await creditCoins(claimed.userId, claimed.coinsRedeemed, "Coins returned for cancelled order", claimed._id);
        }
        const refunded = await refundOrder(claimed._id, "Item sold out during payment");
        await sendEmailSafely(refunded || claimed);
      }
      return { order: await orderModel.findById(order._id), outcome: "out_of_stock_refunded" };
    }
    if (error?.code === 11000 && /razorpayPaymentId/.test(error.message)) {
      return { order: await orderModel.findById(order._id), outcome: "already_paid" };
    }
    throw error;
  }

  if (!paidOrder) {
    const latest = await orderModel.findById(order._id);
    return { order: latest, outcome: latest.payment ? "already_paid" : "not_paid" };
  }

  await sendEmailSafely(paidOrder);
  return { order: paidOrder, outcome: "paid" };
};

/**
 * Settle an unpaid online order against Razorpay's records: confirm it if
 * a payment actually went through, otherwise expire it once its payment
 * window has passed (returning reserved coins).
 */
export const reconcilePendingOrder = async (order) => {
  try {
    if (order.razorpayOrderId) {
      const payments = await fetchOrderPayments(order.razorpayOrderId);
      const done = payments.find((p) => p.status === "captured") || payments.find((p) => p.status === "authorized");
      if (done) {
        await finalizeRazorpayPayment({ razorpayOrderId: order.razorpayOrderId, paymentId: done.id });
        return;
      }
    }
    const expiresAt = order.paymentExpiresAt || new Date(new Date(order.createdAt).getTime() + PAYMENT_WINDOW_MS);
    if (expiresAt.getTime() < Date.now()) {
      await transitionOrder(order._id, "Cancelled", {
        allowedFrom: ["Pending Payment"],
        notify: false,
        extra: { paymentStatus: "expired", cancelReason: "Payment was not completed in time" },
      });
    }
  } catch (error) {
    if (!(error instanceof OrderTransitionError)) {
      console.error(`Reconcile failed for order ${order._id}:`, describeGatewayError(error));
    }
  }
};

export const reconcileUserPendingOrders = async (userId) => {
  const stale = await orderModel.find({
    userId,
    status: "Pending Payment",
    $or: [
      { paymentExpiresAt: { $lt: new Date() } },
      { paymentExpiresAt: { $exists: false }, createdAt: { $lt: new Date(Date.now() - PAYMENT_WINDOW_MS) } },
    ],
  }).limit(10);
  for (const order of stale) await reconcilePendingOrder(order);
};

export const reconcileAllPendingOrders = async ({ limit = 200 } = {}) => {
  const stale = await orderModel.find({
    status: "Pending Payment",
    $or: [
      { paymentExpiresAt: { $lt: new Date() } },
      { paymentExpiresAt: { $exists: false }, createdAt: { $lt: new Date(Date.now() - PAYMENT_WINDOW_MS) } },
    ],
  }).limit(limit);
  for (const order of stale) await reconcilePendingOrder(order);
  return { checked: stale.length };
};

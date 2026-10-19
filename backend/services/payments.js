import Razorpay from "razorpay";
import crypto from "crypto";

let client = null;

export class PaymentConfigError extends Error {}

// Created on first use so a missing key can't crash the whole server at startup.
export const razorpay = () => {
  if (client) return client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new PaymentConfigError("Online payments are not configured");
  }
  client = new Razorpay({ key_id, key_secret });
  return client;
};

// Integration tests swap in a fake gateway client
export const setRazorpayClientForTests = (fake) => {
  client = fake;
};

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID;

export const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const hmacHex = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

const safeEqualHex = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// Checkout handler signature: HMAC(order_id|payment_id) with the key secret.
// Uses the order id stored on our side, never one sent by the browser alone.
export const isValidCheckoutSignature = (razorpayOrderId, razorpayPaymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpayOrderId || !razorpayPaymentId) return false;
  return safeEqualHex(hmacHex(secret, `${razorpayOrderId}|${razorpayPaymentId}`), signature);
};

// Webhook signature: HMAC(raw request body) with the webhook secret.
export const isValidWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody) return false;
  return safeEqualHex(hmacHex(secret, rawBody), signature);
};

// Razorpay SDK errors carry { statusCode, error: { description, code } }
export const describeGatewayError = (error) =>
  error?.error?.description || error?.description || error?.message || "Payment gateway error";

export const createGatewayOrder = ({ amountPaise, receipt, notes }) =>
  razorpay().orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes,
    // Capture automatically once the customer completes payment
    payment_capture: 1,
  });

export const fetchPayment = (paymentId) => razorpay().payments.fetch(paymentId);

export const fetchOrderPayments = async (razorpayOrderId) => {
  const res = await razorpay().orders.fetchPayments(razorpayOrderId);
  return res?.items || [];
};

export const capturePayment = (paymentId, amountPaise) =>
  razorpay().payments.capture(paymentId, amountPaise, "INR");

export const refundPayment = (paymentId, { amountPaise, receipt, notes }) =>
  razorpay().payments.refund(paymentId, {
    amount: amountPaise,
    speed: "normal",
    receipt,
    notes,
  });

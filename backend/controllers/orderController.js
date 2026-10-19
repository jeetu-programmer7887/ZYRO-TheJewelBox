import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import {
  transitionOrder, OrderTransitionError, CUSTOMER_CANCELLABLE, RETURN_WINDOW_DAYS,
} from "../services/orderLifecycle.js";
import {
  buildQuote, placeOrder as placeOrderService, resumePayment, finalizeRazorpayPayment,
  reconcileUserPendingOrders, toOrderView, lookupPincode, CheckoutError, PRICING_RULES,
} from "../services/checkout.js";
import {
  isValidCheckoutSignature, isValidWebhookSignature, PaymentConfigError, describeGatewayError,
} from "../services/payments.js";

// Map service errors to HTTP responses; never leak internals
const handleError = (res, error, context) => {
  if (error instanceof CheckoutError || error instanceof OrderTransitionError) {
    return res.status(error.status).json({ success: false, message: error.message, ...(error.extra || {}) });
  }
  if (error instanceof PaymentConfigError) {
    return res.status(503).json({ success: false, message: "Online payment is unavailable right now. Please choose Cash on Delivery." });
  }
  if (error?.statusCode && error?.error) {
    // Razorpay SDK error
    console.error(`${context} (gateway):`, describeGatewayError(error));
    return res.status(502).json({ success: false, message: "The payment service didn't respond. Please try again in a moment." });
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
};

// 1. Checkout quote: the cart priced by the server
const getQuote = async (req, res) => {
  try {
    const useCoins = req.body?.useCoins === true || req.query.useCoins === "true";
    const quote = await buildQuote(req.user._id, { useCoins });
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, quote, rules: PRICING_RULES });
  } catch (error) {
    return handleError(res, error, "Quote Error");
  }
};

// 2. Pincode serviceability + city/state
const checkPincode = async (req, res) => {
  try {
    const pincode = String(req.params.pincode || "");
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: "Please enter a valid 6-digit pincode" });
    }
    const result = await lookupPincode(pincode);
    if (!result.serviceable) {
      return res.json({ success: true, serviceable: false, message: "Sorry, we don't deliver to this pincode yet" });
    }
    res.set("Cache-Control", "public, max-age=86400");
    return res.json({
      success: true,
      serviceable: true,
      city: result.city,
      state: result.state,
      delivery: { days: PRICING_RULES.deliveryDays, label: PRICING_RULES.deliveryLabel },
    });
  } catch (error) {
    console.error("Pincode Lookup Error:", error.message);
    return res.status(503).json({ success: false, message: "Couldn't check this pincode right now. Please try again." });
  }
};

// 3. Place an order (COD or Razorpay). Body: { address, paymentMethod, useCoins, idempotencyKey, expectedTotal }
const placeOrder = async (req, res) => {
  try {
    const result = await placeOrderService(req.user, {
      address: req.body.address,
      paymentMethod: req.body.paymentMethod,
      useCoins: req.body.useCoins === true,
      idempotencyKey: req.body.idempotencyKey,
      expectedTotal: req.body.expectedTotal,
    });
    return res.status(201).json({
      success: true,
      message: result.checkout ? "Order created. Complete the payment to confirm it." : "Order placed successfully",
      ...result,
    });
  } catch (error) {
    return handleError(res, error, "Place Order Error");
  }
};

// 4. Pay for an existing order that is still awaiting payment
const payOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }
    const result = await resumePayment(req.user, req.params.orderId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error, "Pay Order Error");
  }
};

// 5. Verify the Razorpay checkout callback
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string" && v.length < 100)) {
      return res.status(400).json({ success: false, message: "Invalid payment response" });
    }

    // The Razorpay order must be one we created for this customer
    const order = await orderModel.findOne({ razorpayOrderId: razorpay_order_id, userId: req.user._id }).select("_id").lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found for this payment" });
    }
    if (!isValidCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const { order: updated, outcome } = await finalizeRazorpayPayment({
      razorpayOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    const view = toOrderView(updated);
    if (outcome === "paid" || outcome === "already_paid" || outcome === "duplicate_refunded") {
      return res.json({ success: true, message: "Payment successful. Your order is confirmed!", order: view });
    }
    if (outcome === "out_of_stock_refunded") {
      return res.status(409).json({ success: false, code: "OUT_OF_STOCK", message: view.cancelReason, order: view });
    }
    if (outcome === "refunded_cancelled") {
      return res.status(409).json({ success: false, code: "ORDER_CANCELLED", message: "This order was cancelled before the payment completed, so your payment is being refunded.", order: view });
    }
    return res.status(409).json({ success: false, message: "We couldn't confirm this payment yet. Please check My Orders in a minute.", order: view });
  } catch (error) {
    return handleError(res, error, "Verify Payment Error");
  }
};

// 6. Razorpay webhook (server-to-server; raw body, signed with the webhook secret)
const razorpayWebhook = async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  if (!isValidWebhookSignature(raw, req.headers["x-razorpay-signature"])) {
    return res.status(400).json({ success: false });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ success: false });
  }

  try {
    const payment = event.payload?.payment?.entity;
    const refund = event.payload?.refund?.entity;

    switch (event.event) {
      case "payment.authorized":
      case "payment.captured":
      case "order.paid":
        if (payment?.order_id && payment?.id) {
          await finalizeRazorpayPayment({ razorpayOrderId: payment.order_id, paymentId: payment.id });
        }
        break;
      case "payment.failed":
        if (payment?.order_id) {
          await orderModel.updateOne(
            { razorpayOrderId: payment.order_id, payment: false, status: "Pending Payment" },
            { $set: { paymentStatus: "failed", paymentFailureReason: payment.error_description || "Payment failed" } }
          );
        }
        break;
      case "refund.processed":
      case "refund.failed":
        if (refund?.payment_id) {
          const processed = event.event === "refund.processed";
          await orderModel.updateOne(
            { razorpayPaymentId: refund.payment_id },
            {
              $set: processed
                ? { refundStatus: "processed", refundId: refund.id, refundAmount: refund.amount / 100, refundedAt: new Date(), paymentStatus: "refunded" }
                : { refundStatus: "failed", refundError: "Refund failed at the payment gateway" },
            }
          );
        }
        break;
      default:
        break;
    }
    return res.json({ success: true });
  } catch (error) {
    if (error instanceof CheckoutError && error.status < 500) {
      // Not ours or not actionable: acknowledge so Razorpay stops retrying
      console.warn("Webhook ignored:", error.message);
      return res.json({ success: true });
    }
    console.error("Webhook processing error:", error);
    // 5xx makes Razorpay retry the webhook later
    return res.status(500).json({ success: false });
  }
};

// 7. User Orders
const userOrders = async (req, res) => {
  try {
    // Settle any unpaid online orders first so statuses are accurate
    await reconcileUserPendingOrders(req.user._id);

    const orders = await orderModel.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.set("Cache-Control", "no-store");
    return res.json({ success: true, orders: orders.map(toOrderView) });
  } catch (error) {
    return handleError(res, error, "User Orders Error");
  }
};

// 8. Single order
const getOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }
    const order = await orderModel.findOne({ _id: req.params.orderId, userId: req.user._id }).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, order: toOrderView(order) });
  } catch (error) {
    return handleError(res, error, "Get Order Error");
  }
};

// 9. Cancel Order (before it ships). Paid online orders are refunded automatically.
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";

    const order = await transitionOrder(orderId, "Cancelled", {
      userId: req.user._id,
      allowedFrom: CUSTOMER_CANCELLABLE,
      extra: { cancelReason: reason || "Cancelled by customer" },
    });
    const view = toOrderView(order);

    let message = "Order cancelled successfully";
    if (view.refundStatus === "processed" || view.refundStatus === "pending") {
      message = "Order cancelled. Your refund has been initiated and usually reaches your account in 5–7 business days.";
    } else if (view.refundStatus === "failed") {
      message = "Order cancelled. We couldn't start your refund automatically; our team will process it shortly.";
    }
    return res.json({ success: true, message, order: view });
  } catch (error) {
    if (error instanceof OrderTransitionError && error.status === 400) {
      return res.status(400).json({ success: false, message: "This order can no longer be cancelled because it has already shipped." });
    }
    return handleError(res, error, "Cancel Order Error");
  }
};

// 10. Fetch Coins balance + history
const fetchCoins = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select('coinsPresent coinsEarned coinsHistory').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      success: true,
      coins: user.coinsPresent || 0,
      totalCoinsEarned: user.coinsEarned || 0,
      coinsHistory: (user.coinsHistory || []).slice(-20).reverse(),
      coinValue: PRICING_RULES.coinValue,
    });
  } catch (error) {
    return handleError(res, error, "Fetch Coins Error");
  }
};

// 11. Return request (within the return window)
const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.body;
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order" });
    }

    const order = await orderModel.findOne({ _id: orderId, userId: req.user._id }).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const view = toOrderView(order);
    if (order.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
    }
    if (!view.actions.canReturn) {
      return res.status(400).json({
        success: false,
        message: `Returns are accepted within ${RETURN_WINDOW_DAYS} days of delivery. This order is outside the return window.`,
      });
    }

    const updated = await transitionOrder(orderId, "Return Requested", {
      userId: req.user._id,
      allowedFrom: ["Delivered"],
      notify: false,
      extra: { returnReason: reason || "No reason provided" },
    });

    return res.json({ success: true, message: "Return request submitted successfully", order: toOrderView(updated) });
  } catch (error) {
    return handleError(res, error, "Return Request Error");
  }
};

export {
  getQuote, checkPincode, placeOrder, payOrder, verifyRazorpay, razorpayWebhook,
  userOrders, getOrder, cancelOrder, fetchCoins, requestReturn,
};

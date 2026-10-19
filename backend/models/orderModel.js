import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
      title: { type: String, required: true },
      price: { type: Number, required: true },   // unit price charged (from the database at checkout)
      quantity: { type: Number, required: true, min: 1 },
      image: { type: String, default: "" },
      variantSku: { type: String },
      // Which variants the stock was taken from, so cancellations and
      // returns put it back in exactly the same place.
      allocations: [{ _id: false, sku: String, quantity: Number }],
    }
  ],

  // Price breakdown, all computed by the server
  subtotal: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  coinDiscount: { type: Number, default: 0 },
  amount: { type: Number, required: true },        // final amount payable, in rupees
  currency: { type: String, default: 'INR' },

  address: { type: Object, required: true },

  status: {
    type: String,
    default: 'Order Placed',
    enum: [
      'Pending Payment',  // Razorpay order created but not yet paid
      'Order Placed',
      'Packing',
      'Shipped',
      'Out for delivery',
      'Delivered',
      'Cancelled',
      'Return Requested',
      'Returned'
    ]
  },
  returnReason: { type: String, default: null },
  cancelReason: { type: String, default: null },

  deliveryDate: { type: Date },

  paymentMethod: { type: String, required: true, enum: ['COD', 'Razorpay'] },
  payment: { type: Boolean, default: false },      // true once money is received
  paymentStatus: {
    type: String,
    enum: ['cod_pending', 'cod_collected', 'created', 'failed', 'captured', 'expired', 'refunded'],
    default: 'cod_pending',
  },
  paidAt: { type: Date },
  paymentFailureReason: { type: String, default: null },
  paymentExpiresAt: { type: Date },                // Razorpay orders must be paid before this

  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },

  // Refunds (online payments only; COD refunds are settled offline)
  refundStatus: { type: String, enum: ['none', 'pending', 'processed', 'failed', 'manual'], default: 'none' },
  refundId: { type: String, default: null },
  refundAmount: { type: Number, default: 0 },
  refundedAt: { type: Date },
  refundError: { type: String, default: null },

  // Bookkeeping so every side effect happens exactly once
  stockCommitted: { type: Boolean, default: false },
  coinsDebited: { type: Boolean, default: false },
  idempotencyKey: { type: String },

  // Legacy: pending Razorpay orders used to be auto-deleted via a TTL index
  expireAt: { type: Date },

  coinsAwarded: { type: Boolean, default: false },
  coinsEarned: { type: Number, default: 0 },
  coinsRedeemed: { type: Number, default: 0 },

}, { timestamps: true });

orderSchema.index({ userId: 1, createdAt: -1 });   // customer order history
orderSchema.index({ createdAt: -1 });              // admin list, dashboard ranges
orderSchema.index({ status: 1, createdAt: -1 });   // status cron, dashboard
orderSchema.index({ razorpayOrderId: 1 }, { unique: true, partialFilterExpression: { razorpayOrderId: { $type: 'string' } } });
// One payment can only ever confirm one order
orderSchema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } });
// A retried "Place order" request returns the same order instead of a duplicate
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ status: 1, paymentExpiresAt: 1 }); // expiring unpaid orders

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema);

export default orderModel;

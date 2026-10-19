import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
      title: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String, required: true },
      variantSku: { type: String }
    }
  ],

  amount: { type: Number, required: true },
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

  deliveryDate: { type: Date },

  paymentMethod: { type: String, required: true },
  payment: { type: Boolean, default: false },
  // Set to "pending" when a paid online order is cancelled; the payment
  // integration moves it to "processed" / "failed".
  refundStatus: { type: String, enum: ['none', 'pending', 'processed', 'failed'], default: 'none' },
  expireAt: { type: Date, index: { expires: '10m' } },

  coinsAwarded: { type: Boolean, default: false },
  coinsEarned: { type: Number, default: 0 },
  coinsRedeemed: { type: Number, default: 0 },

}, { timestamps: true });

orderSchema.index({ userId: 1, createdAt: -1 });   // customer order history
orderSchema.index({ createdAt: -1 });              // admin list, dashboard ranges
orderSchema.index({ status: 1, createdAt: -1 });   // status cron, dashboard

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema);

export default orderModel;
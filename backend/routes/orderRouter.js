import express from 'express';
import {
    getQuote, checkPincode, placeOrder, payOrder, verifyRazorpay, razorpayWebhook,
    userOrders, getOrder, cancelOrder, fetchCoins, requestReturn,
} from '../controllers/orderController.js';
import { authUser } from '../middleware/authUser.js';

const orderRouter = express.Router();

// Razorpay → server (signed with RAZORPAY_WEBHOOK_SECRET, no user session)
orderRouter.post('/razorpay-webhook', razorpayWebhook);

// Checkout
orderRouter.post('/quote', authUser, getQuote);
orderRouter.get('/pincode/:pincode', authUser, checkPincode);
orderRouter.post('/place', authUser, placeOrder);              // COD or Razorpay
orderRouter.post('/verify-razorpay', authUser, verifyRazorpay);
orderRouter.post('/:orderId/pay', authUser, payOrder);          // retry payment for a pending order

// My Orders
orderRouter.get('/userorders', authUser, userOrders);
orderRouter.get('/fetch-coins', authUser, fetchCoins);
orderRouter.patch('/cancel', authUser, cancelOrder);
orderRouter.patch('/return-request', authUser, requestReturn);
orderRouter.get('/:orderId', authUser, getOrder);

export default orderRouter;

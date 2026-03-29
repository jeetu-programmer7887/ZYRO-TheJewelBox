import express from 'express';
import { cancelOrder, placeOrder, placeOrderRazorpay, userOrders, verifyRazorpay ,fetchCoins ,requestReturn} from '../controllers/orderController.js';
import { authUser } from '../middleware/authUser.js';

const orderRouter = express.Router();

//Payment features
orderRouter.post('/place', authUser, placeOrder); //for COD
orderRouter.post('/razorpay', authUser, placeOrderRazorpay);

//User 
orderRouter.get('/userorders', authUser, userOrders);
orderRouter.patch('/cancel', authUser, cancelOrder);

//Razorpay verfication of payment
orderRouter.post('/verify-razorpay', authUser, verifyRazorpay);

orderRouter.get('/fetch-coins', authUser, fetchCoins);

// orderRouter.patch('/return-request', authUser, requestReturn); //  user requests return
orderRouter.patch('/return-request', authUser, requestReturn);

export default orderRouter;
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from '../models/productModel.js';
import razorpay from "razorpay";
import crypto from "crypto";
import sendOrderEmail from "../middleware/sendOrderEmail.js";

// Razorpay Initialization
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// COIN HELPERS 
const addCoins = async (userId, coins, reason, orderId) => {
    await userModel.findByIdAndUpdate(userId, {
        $inc: { coinsPresent: coins, coinsEarned: coins }, //  fixed
        $push: {
            coinsHistory: { type: "earned", coins, reason, orderId }
        }
    });
};

const deductCoins = async (userId, coins, reason, orderId) => {
    await userModel.findByIdAndUpdate(userId, {
        $inc: { coinsPresent: -coins }, //  fixed — only deduct from balance
        $push: {
            coinsHistory: { type: "deducted", coins, reason, orderId }
        }
    });
};


// 1. Placing order by COD Method
const placeOrder = async (req, res) => {
    try {
        const { items, address, amount, deliveryDate, coinsToRedeem = 0 } = req.body;
        const userId = req.user._id;

        //  Validate coins if user wants to redeem
        const user = await userModel.findById(userId).select('coinsPresent');
        if (!user || user.coinsPresent < coinsToRedeem) {
            return res.status(400).json({ success: false, message: "Insufficient coins" });
        }

        //  Apply coin discount (1 coin = ₹5, max 10% of amount)
        const maxDiscount = Math.floor(amount * 0.10);
        const maxCoinsUsable = Math.floor(maxDiscount / 5);
        const coinsUsed = Math.min(coinsToRedeem, maxCoinsUsable);
        const coinDiscount = coinsUsed * 5;
        const finalAmount = Math.max(1, amount - coinDiscount);

        const orderData = {
            userId,
            items,
            address,
            deliveryDate: new Date(Date.now() + `${deliveryDate}` * 24 * 60 * 60 * 1000),
            amount: finalAmount,
            paymentMethod: "COD",
            payment: false,
            coinsRedeemed: coinsUsed,
            coinsEarned: 0,
            coinsAwarded: false
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        await userModel.findByIdAndUpdate(userId, {
            $push: { orders: newOrder._id },
            $set: { cartData: {} }
        });

        await sendOrderEmail(req.user.email, newOrder);
        //  Deduct redeemed coins immediately
        if (coinsUsed > 0) {
            await deductCoins(userId, coinsUsed, `Redeemed at checkout`, newOrder._id);
        }

        // Decrement stock for each ordered item
        for (const item of items) {
            const product = await productModel.findById(item.productId);
            if (!product) continue;
            if (item.variantSku === "Standard") {
                product.variants[0].stock -= item.quantity;
            } else {
                const variant = product.variants.find(v => v.sku === item.variantSku);
                if (variant) variant.stock -= item.quantity;
            }
            await product.save();
        }

        res.json({
            success: true,
            message: "Order Placed Successfully",
            orderId: newOrder._id,
            coinsUsed,
            finalAmount
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// 2. Placing order by Razorpay Method
const placeOrderRazorpay = async (req, res) => {
    try {
        const { items, address, amount, deliveryDate, coinsToRedeem = 0 } = req.body;
        const userId = req.user._id;

        const user = await userModel.findById(userId).select('coinsPresent');
        if (!user || user.coinsPresent < coinsToRedeem) {
            return res.status(400).json({ success: false, message: "Insufficient coins" });
        }

        const maxDiscount = Math.floor(amount * 0.10);
        const maxCoinsUsable = Math.floor(maxDiscount / 5);
        const coinsUsed = Math.min(coinsToRedeem, maxCoinsUsable);
        const coinDiscount = coinsUsed * 5;
        const finalAmount = Math.max(1, amount - coinDiscount);

        const orderData = {
            userId,
            items,
            address,
            deliveryDate: new Date(Date.now() + `${deliveryDate}` * 24 * 60 * 60 * 1000),
            amount: finalAmount,
            paymentMethod: "Razorpay",
            payment: false,
            status: 'Pending Payment',   
            expireAt: new Date(),       
            coinsRedeemed: coinsUsed,
            coinsEarned: 0,
            coinsAwarded: false
        };

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const options = {
            amount: finalAmount * 100,
            currency: 'INR',
            receipt: newOrder._id.toString()
        };

        razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                return res.json({ success: false, message: error });
            }
            res.json({ success: true, order, mongoOrderId: newOrder._id });
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

 // 3. Verify Razorpay Payment
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mongoOrderId } = req.body;
        const userId = req.user._id;

        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
        }

        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);

        if (payment.status !== "captured" || payment.order_id !== razorpay_order_id) {
            return res.status(400).json({ success: false, message: "Payment not completed or invalid order mapping" });
        }

        const order = await orderModel.findOne({ _id: mongoOrderId, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (payment.amount !== order.amount * 100) {
            return res.status(400).json({ success: false, message: "Payment amount mismatch" });
        }

        const updatedOrder = await orderModel.findOneAndUpdate(
            { _id: mongoOrderId, userId, payment: false },
            {
                payment: true,
                status: 'Order Placed', 
                $unset: { expireAt: 1 }      
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(409).json({ success: false, message: "Order already processed or not found" });
        }

        await userModel.findByIdAndUpdate(userId, {
            $addToSet: { orders: mongoOrderId },
            $set: { cartData: {} }
        });

        // Send confirmation email only after payment is verified
        await sendOrderEmail(req.user.email, updatedOrder);

        if (order.coinsRedeemed > 0) {
            await deductCoins(userId, order.coinsRedeemed, `Redeemed at checkout`, mongoOrderId);
        }

        for (const item of order.items) {
            const product = await productModel.findById(item.productId);
            if (!product) continue;
            if (item.variantSku === "Standard") {
                product.variants[0].stock -= item.quantity;
            } else {
                const variant = product.variants.find(v => v.sku === item.variantSku);
                if (variant) variant.stock -= item.quantity;
            }
            await product.save();
        }

        return res.json({ success: true, message: "Payment verified and recorded successfully" });

    } catch (error) {
        console.error("Razorpay verification error:", error);
        return res.status(500).json({ success: false, message: "Internal payment verification error" });
    }
};

// 4. User Orders
const userOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await orderModel.find({ userId })
            .select('items amount status paymentMethod payment createdAt deliveryDate coinsRedeemed coinsEarned coinsAwarded returnReason') //  returnReason added
            .sort({ createdAt: -1 });

        return res.json({ success: true, orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Cancel Order
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        const order = await orderModel.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        if (order.status === "Cancelled") {
            return res.status(400).json({ success: false, message: "Order is already cancelled" });
        }

        // Restore stock
        for (const item of order.items) {
            const product = await productModel.findById(item.productId);
            if (!product) continue;
            if (item.variantSku === "Standard") {
                product.variants[0].stock += item.quantity;
            } else {
                const variant = product.variants.find(v => v.sku === item.variantSku);
                if (variant) variant.stock += item.quantity;
            }
            await product.save();
        }

        // Update order status to Cancelled
        const updatedOrder = await orderModel.findByIdAndUpdate(
            orderId,
            { status: "Cancelled" },
            { new: true }
        );

        try {
            await sendOrderEmail(req.user.email, updatedOrder);
        } catch (error) {
            console.error("Email failed to send, but order was updated:", emailError);
        }

        //  Refund redeemed coins back if order cancelled
        if (order.coinsRedeemed > 0) {
            await addCoins(userId, order.coinsRedeemed, `Refund for cancelled order`, orderId);
        }

        return res.json({ success: true, message: "Order Cancelled Successfully" });

    } catch (error) {
        console.log("Cancel Order Error", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

// 6. Fetch Coins balance + history
const fetchCoins = async (req, res) => {
    try {
        const userId = req.user._id;
        //  select correct field names from schema
        const user = await userModel.findById(userId).select('coinsPresent coinsEarned coinsHistory');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            coins: user.coinsPresent || 0,
            totalCoinsEarned: user.coinsEarned || 0,
            coinsHistory: (user.coinsHistory || []).slice(-20).reverse()
        });
    } catch (error) {
        console.log("Fetch Coins Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const requestReturn = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.user._id;

        const order = await orderModel.findOne({ _id: orderId, userId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (order.status !== "Delivered") {
            return res.status(400).json({ success: false, message: "Only delivered orders can be returned" });
        }

        await orderModel.findByIdAndUpdate(orderId, {
            status: "Return Requested",
            returnReason: reason || "No reason provided"
        });

        return res.json({ success: true, message: "Return request submitted successfully" });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { placeOrder, placeOrderRazorpay, verifyRazorpay, userOrders, cancelOrder, fetchCoins, requestReturn };
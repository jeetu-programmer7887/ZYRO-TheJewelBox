import { GoogleGenerativeAI } from "@google/generative-ai";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { supportPolicies } from "../config/supportPolicies.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

export const handleSupportChat = async (req, res) => {
    try {
        const { message, history } = req.body;
        const userId = req.user?._id;

        let userContext = "User: Guest.";
        let orderContext = "No order ID detected.";
        let productContext = "";

        // 1. Fetch User Detail (Privacy Restricted)
        if (userId) {
            const user = await userModel.findById(userId).select('firstName lastName -_id');
            if (user) userContext = `User: ${user.firstName} ${user.lastName}. Address them by name.`;
        }

        // 2. Fetch Order Detail (if ID detected)
        const orderIdMatch = message.match(/\b[0-9a-fA-F]{24}\b/);
        if (orderIdMatch) {
            const order = await orderModel.findById(orderIdMatch[0]);
            if (order) {
                orderContext = `LIVE ORDER DATA: ID ${order._id}, Status: ${order.status}, Amount: ₹${order.amount}, Date: ${new Date(order.createdAt).toDateString()}.`;
            }
        }

        // 3. Smart Product Scanning (Finds product mentions in query)
        const allProducts = await productModel.find({}).select('title price category -_id');
        const mentionedProduct = allProducts.find(p => message.toLowerCase().includes(p.title.toLowerCase()));
        if (mentionedProduct) {
            productContext = `PRODUCT DATA: ${mentionedProduct.title} is currently ₹${mentionedProduct.price} in ${mentionedProduct.category}.`;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `
        You are the ZYRO bot an AI powered Assistant.
        ${userContext}
        Policies: ${supportPolicies}
        ${orderContext}
        ${productContext}

        CONSTRAINTS:
        - PRIVACY: Never reveal the user's password, exact mobile number, or full street address.
        - POLICIES: Strictly follow the Return/Shipping policies. Do not offer discounts you aren't authorized for.
        - HISTORY: You have access to previous chat history provided by the client. Use it for context.
        - REFRESH: If order data is present, prioritize tracking info.
        `;

        // Start chat with the history passed from Frontend
        const chat = model.startChat({
            history: history || [],
        });

        const result = await chat.sendMessage(systemPrompt + "\nUser: " + message);
        const response = result.response;
        
        res.json({ success: true, reply: response.text() });

    } catch (error) {
        console.error("Advanced Support Error:", error);
        res.status(500).json({ success: false, message: "Concierge is resting. Try again soon." });
    }
};

import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

const MAX_QTY_PER_ITEM = 10;
const MAX_WISHLIST = 200;

const isObjectId = (id) => typeof id === "string" && mongoose.isValidObjectId(id) && /^[0-9a-f]{24}$/i.test(id);

const availableStock = (product) =>
    (product.variants || []).reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0);

const findSellableProduct = (itemId) =>
    productModel.findOne({ _id: itemId, isActive: { $ne: false } }).select("variants title").lean();

const getCartData = async (userId) => {
    const user = await userModel.findById(userId).select("cartData").lean();
    return user?.cartData || {};
};

// Cart Functions
const addToCart = async (req, res) => {
    try {
        const { itemId } = req.body;
        if (!isObjectId(itemId)) {
            return res.status(400).json({ success: false, message: "Invalid product" });
        }

        const product = await findSellableProduct(itemId);
        if (!product) {
            return res.status(404).json({ success: false, message: "This product is no longer available" });
        }

        const stock = availableStock(product);
        const cartData = await getCartData(req.user._id);
        const nextQty = (cartData[itemId] || 0) + 1;

        if (stock <= 0) {
            return res.status(400).json({ success: false, message: "This product is out of stock" });
        }
        if (nextQty > Math.min(stock, MAX_QTY_PER_ITEM)) {
            return res.status(400).json({
                success: false,
                message: nextQty > stock ? `Only ${stock} left in stock` : `You can add up to ${MAX_QTY_PER_ITEM} of this item`,
            });
        }

        // Atomic increment so two quick taps can't overwrite each other
        await userModel.updateOne({ _id: req.user._id }, { $inc: { [`cartData.${itemId}`]: 1 } });

        return res.json({ success: true, message: "Added to cart", quantity: nextQty });
    } catch (error) {
        console.error("Cart Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't update your cart. Please try again." });
    }
}

const getUserCart = async (req, res) => {
    try {
        const cartData = await getCartData(req.user._id);
        return res.json({ success: true, cartData });
    } catch (error) {
        console.error("Cart Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't load your cart" });
    }
}

const updateQuantity = async (req, res) => {
    try {
        const { itemId } = req.body;
        const quantity = Number(req.body.quantity);

        if (!isObjectId(itemId) || !Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({ success: false, message: "Invalid quantity" });
        }

        if (quantity === 0) {
            await userModel.updateOne({ _id: req.user._id }, { $unset: { [`cartData.${itemId}`]: "" } });
            return res.json({ success: true, message: "Removed from cart" });
        }

        const product = await findSellableProduct(itemId);
        if (!product) {
            await userModel.updateOne({ _id: req.user._id }, { $unset: { [`cartData.${itemId}`]: "" } });
            return res.status(404).json({ success: false, message: "This product is no longer available" });
        }

        const stock = availableStock(product);
        if (quantity > Math.min(stock, MAX_QTY_PER_ITEM)) {
            return res.status(400).json({
                success: false,
                message: quantity > stock
                    ? (stock > 0 ? `Only ${stock} left in stock` : "This product is out of stock")
                    : `You can add up to ${MAX_QTY_PER_ITEM} of this item`,
            });
        }

        await userModel.updateOne({ _id: req.user._id }, { $set: { [`cartData.${itemId}`]: quantity } });
        return res.json({ success: true, message: "Cart updated" });
    } catch (error) {
        console.error("Cart Update Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't update your cart. Please try again." });
    }
}

// Wishlist Functions
const addToWishlist = async (req, res) => {
    try {
        const { itemId } = req.body;
        if (!isObjectId(itemId)) {
            return res.status(400).json({ success: false, message: "Invalid product" });
        }

        const updatedUser = await userModel.findOneAndUpdate(
            { _id: req.user._id, [`wishList.${MAX_WISHLIST - 1}`]: { $exists: false } },
            { $addToSet: { wishList: itemId } },
            { new: true, projection: { wishList: 1 } }
        );

        if (!updatedUser) {
            return res.status(400).json({ success: false, message: "Your wishlist is full" });
        }

        return res.json({ success: true, message: "Added to Wishlist", wishList: updatedUser.wishList });
    } catch (error) {
        console.error("Wishlist Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't update your wishlist" });
    }
}

const getWishlist = async (req, res) => {
    try {
        const user = await userModel.findById(req.user._id).select("wishList").lean();
        return res.json({ success: true, wishlistData: user?.wishList || [] });
    } catch (error) {
        console.error("Wishlist Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't load your wishlist" });
    }
}

const removeWishlist = async (req, res) => {
    try {
        const { itemId } = req.body;
        if (typeof itemId !== "string") {
            return res.status(400).json({ success: false, message: "Invalid product" });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            req.user._id,
            { $pull: { wishList: itemId } },
            { new: true, projection: { wishList: 1 } }
        );

        return res.json({ success: true, message: "Removed from Wishlist", wishList: updatedUser?.wishList || [] });
    } catch (error) {
        console.error("Remove Wishlist Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't update your wishlist" });
    }
}

const mergeWishlist = async (req, res) => {
    try {
        const { guestWishlist } = req.body;
        if (!Array.isArray(guestWishlist)) {
            return res.status(400).json({ success: false, message: "Invalid wishlist" });
        }
        const ids = [...new Set(guestWishlist.filter(isObjectId))].slice(0, MAX_WISHLIST);

        const updatedUser = await userModel.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { wishList: { $each: ids } } },
            { new: true, projection: { wishList: 1 } }
        ).lean();

        return res.json({ success: true, wishlistData: updatedUser?.wishList || [], message: "Wishlist merged!" });
    } catch (error) {
        console.error("Merge Wishlist Error:", error);
        return res.status(500).json({ success: false, message: "Merge failed on server" });
    }
};

export { addToCart, getUserCart, updateQuantity, addToWishlist, removeWishlist, getWishlist, mergeWishlist }

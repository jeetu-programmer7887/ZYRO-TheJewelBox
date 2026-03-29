import userModel from "../models/userModel.js";

// Cart Functions
const addToCart = async (req, res) => {
    try {
        const { itemId } = req.body;
        const user = req.user;

        const cartData = user.cartData;

        if (cartData[itemId]) {
            cartData[itemId] += 1;
        } else {
            cartData[itemId] = 1;
        }

        await userModel.findByIdAndUpdate(user._id, { cartData });

        return res.json({ success: true, message: "Added to cart" })

    } catch (error) {
        console.log("Cart Error : ", error);
        res.json({ success: false, message: error.message });
    }
}

const getUserCart = async (req, res) => {
    try {
        const cartData = req.user.cartData;

        return res.json({ success: true, cartData });

    } catch (error) {
        console.log("Cart Error : ", error);
        res.json({ success: false, message: error.message });
    }
}

const updateQuantity = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;

        const user = req.user;

        let cartData = await user.cartData;

        if (quantity > 0) {
            cartData[itemId] = quantity;
        } else {
            delete cartData[itemId];
        }

        await userModel.findByIdAndUpdate(user._id, { cartData });

        res.json({ success: true, message: "Cart Updated" });

    } catch (error) {
        console.log("Cart Update Error:", error);
        res.json({ success: false, message: error.message });
    }
}

// Wishlist Functions
const addToWishlist = async (req, res) => {
    try {
        const { itemId } = req.body;
        const user = req.user;

        const updatedUser = await userModel.findByIdAndUpdate(
            user._id,
            { $addToSet: { wishList: itemId } }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            message: "Added to Wishlist",
            wishList: updatedUser.wishList
        });

    } catch (error) {
        console.error("Wishlist Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const getWishlist = async (req, res) => {
    try {
        const wishlistData = req.user.wishList;

        return res.json({ success: true, wishlistData });

    } catch (error) {
        console.log("Wishlist Error : ", error);
        res.json({ success: false, message: error.message });
    }
}

const removeWishlist = async (req, res) => {
    try {
        const { itemId } = req.body;
        const userId = req.user._id;

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $pull: { wishList: itemId } },
            {new : true}
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            message: "Removed from Wishlist",
            wishList: updatedUser.wishList
        });

    } catch (error) {
        console.error("Remove Wishlist Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const mergeWishlist = async (req, res) => {
    try {
        const { guestWishlist } = req.body; 
        const userId = req.user._id;

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { 
              $addToSet: { wishList: { $each: guestWishlist } } 
            },
            { new: true }
        ).populate('wishList');

        res.json({ 
            success: true, 
            wishlistData: updatedUser.wishList, 
            message: "Wishlist merged!" 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Merge failed on server" });
    }
};

export { addToCart, getUserCart, updateQuantity, addToWishlist, removeWishlist, getWishlist, mergeWishlist }
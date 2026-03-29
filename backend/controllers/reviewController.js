import reviewModel from '../models/reviewModel.js';
import orderModel from '../models/orderModel.js';
import { v2 as cloudinary } from 'cloudinary';

// Submit a review
const submitReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, orderId, rating, review } = req.body;

        const order = await orderModel.findOne({
            _id: orderId,
            userId,
            status: 'Delivered'
        });

        if (!order) {
            return res.status(403).json({
                success: false,
                message: "You can only review products from delivered orders"
            });
        }

        const productInOrder = order.items.find(
            item => item.productId.toString() === productId
        );

        if (!productInOrder) {
            return res.status(403).json({
                success: false,
                message: "This product was not part of the specified order"
            });
        }

        const existing = await reviewModel.findOne({ userId, productId, orderId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this product"
            });
        }

        // ✅ Fixed — only upload if image is provided
        let imageUrl = null;
        if (req.file && req.file.buffer) {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'reviews', resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
            imageUrl = result.secure_url;
        }

        const newReview = new reviewModel({
            userId,
            productId,
            orderId,
            rating: Number(rating),
            review,
            image: imageUrl,
            verified: true
        });

        await newReview.save();

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review: newReview
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this product"
            });
        }
        console.error("Submit Review Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get reviews for a product
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await reviewModel.find({ productId })
            .populate('userId', 'firstName lastName')
            .sort({ createdAt: -1 });

        const avgRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0;

        const ratingBreakdown = [5, 4, 3, 2, 1].map(star => ({
            star,
            count: reviews.filter(r => r.rating === star).length
        }));

        return res.json({
            success: true,
            reviews,
            totalReviews: reviews.length,
            avgRating: Number(avgRating),
            ratingBreakdown
        });

    } catch (error) {
        console.error("Get Reviews Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Check if user already reviewed
const checkReviewed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, orderId } = req.params;

        const existing = await reviewModel.findOne({ userId, productId, orderId });

        return res.json({
            success: true,
            hasReviewed: !!existing,
            review: existing || null
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Homepage returns only featured reviews
const getAllHomeReviews = async (req, res) => {
    try {
        const reviews = await reviewModel.find({ verified: true, featured: true })
            .populate('userId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(20);

        return res.json({ success: true, reviews });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Admin gets ALL reviews with full populate
const getAllReviews = async (req, res) => {
    try {
        const reviews = await reviewModel.find({})
            .populate('userId', 'firstName lastName email')
            .populate('productId', 'title thumbnail')
            .sort({ createdAt: -1 });

        return res.json({ success: true, reviews });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Admin toggles featured
const toggleFeaturedReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await reviewModel.findById(reviewId);
        if (!review) return res.status(404).json({ success: false, message: "Review not found" });

        review.featured = !review.featured;
        await review.save();

        return res.json({
            success: true,
            featured: review.featured,
            message: review.featured ? "Added to homepage" : "Removed from homepage"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete review
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        await reviewModel.findByIdAndDelete(reviewId);
        return res.json({ success: true, message: "Review deleted" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { submitReview, getProductReviews, checkReviewed, getAllHomeReviews ,getAllReviews, toggleFeaturedReview, deleteReview };
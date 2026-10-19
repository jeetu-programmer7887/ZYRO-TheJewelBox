import mongoose from 'mongoose';
import reviewModel from '../models/reviewModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import { v2 as cloudinary } from 'cloudinary';

const MAX_REVIEWS_PER_PAGE = 50;

// Keep product.averageRating in sync so listings can show real ratings
const recalcProductRating = async (productId) => {
    const [stats] = await reviewModel.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(String(productId)) } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]);
    await productModel.updateOne(
        { _id: productId },
        { $set: { averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0 } }
    );
};

// Submit a review
const submitReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, orderId } = req.body;
        const rating = Number(req.body.rating);
        const review = typeof req.body.review === 'string' ? req.body.review.trim() : '';

        if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid product or order" });
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: "Please choose a rating from 1 to 5 stars" });
        }
        if (review.length < 3 || review.length > 1000) {
            return res.status(400).json({ success: false, message: "Your review should be between 3 and 1000 characters" });
        }

        const order = await orderModel.findOne({
            _id: orderId,
            userId,
            status: 'Delivered'
        }).select('items').lean();

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

        const existing = await reviewModel.exists({ userId, productId, orderId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this product"
            });
        }

        // Only upload if an image is provided
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

        const newReview = await reviewModel.create({
            userId,
            productId,
            orderId,
            rating,
            review,
            image: imageUrl,
            verified: true
        });

        await recalcProductRating(productId);

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
        return res.status(500).json({ success: false, message: "Couldn't submit your review. Please try again." });
    }
};

// Get reviews for a product (latest 50 + stats over all reviews)
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product" });
        }
        const productObjectId = new mongoose.Types.ObjectId(productId);

        const [reviews, stats] = await Promise.all([
            reviewModel.find({ productId })
                .populate('userId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(MAX_REVIEWS_PER_PAGE)
                .lean(),
            reviewModel.aggregate([
                { $match: { productId: productObjectId } },
                { $group: { _id: '$rating', count: { $sum: 1 } } },
            ]),
        ]);

        const counts = Object.fromEntries(stats.map(s => [s._id, s.count]));
        const totalReviews = stats.reduce((sum, s) => sum + s.count, 0);
        const ratingSum = stats.reduce((sum, s) => sum + s._id * s.count, 0);
        const avgRating = totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

        const ratingBreakdown = [5, 4, 3, 2, 1].map(star => ({
            star,
            count: counts[star] || 0
        }));

        res.set('Cache-Control', 'public, max-age=60');
        return res.json({
            success: true,
            reviews,
            totalReviews,
            avgRating,
            ratingBreakdown
        });

    } catch (error) {
        console.error("Get Reviews Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't load reviews" });
    }
};

// Check if user already reviewed
const checkReviewed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, orderId } = req.params;
        if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid product or order" });
        }

        const existing = await reviewModel.findOne({ userId, productId, orderId }).lean();

        return res.json({
            success: true,
            hasReviewed: !!existing,
            review: existing || null
        });

    } catch (error) {
        console.error("Check Reviewed Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't check review status" });
    }
};

// Homepage returns only featured reviews
const getAllHomeReviews = async (req, res) => {
    try {
        const reviews = await reviewModel.find({ verified: true, featured: true })
            .populate('userId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.set('Cache-Control', 'public, max-age=300');
        return res.json({ success: true, reviews });
    } catch (error) {
        console.error("Home Reviews Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't load reviews" });
    }
};

// Admin gets reviews with full populate (newest first, capped)
const getAllReviews = async (req, res) => {
    try {
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
        const reviews = await reviewModel.find({})
            .populate('userId', 'firstName lastName email')
            .populate('productId', 'title thumbnail')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return res.json({ success: true, reviews });
    } catch (error) {
        console.error("Admin Reviews Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't load reviews" });
    }
};

// Admin toggles featured
const toggleFeaturedReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review" });
        }
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
        console.error("Toggle Featured Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't update the review" });
    }
};

// Delete review
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review" });
        }
        const deleted = await reviewModel.findByIdAndDelete(reviewId);
        if (deleted) await recalcProductRating(deleted.productId);
        return res.json({ success: true, message: "Review deleted" });
    } catch (error) {
        console.error("Delete Review Error:", error);
        return res.status(500).json({ success: false, message: "Couldn't delete the review" });
    }
};

export { submitReview, getProductReviews, checkReviewed, getAllHomeReviews ,getAllReviews, toggleFeaturedReview, deleteReview };

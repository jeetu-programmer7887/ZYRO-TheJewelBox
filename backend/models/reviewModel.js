import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true, trim: true },
    image:  { type: String, default: null },  
    verified: { type: Boolean, default: true },
    featured:   { type: Boolean, default: false }, 
}, { timestamps: true });

// One review per user per product per order
reviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

const reviewModel = mongoose.models.review || mongoose.model('review', reviewSchema);
export default reviewModel;
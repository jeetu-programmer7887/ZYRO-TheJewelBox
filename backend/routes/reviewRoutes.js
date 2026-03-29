import express from 'express';
import multer from 'multer';
import { authUser } from '../middleware/authUser.js';
import { authAdmin } from '../middleware/authAdmin.js';
import { submitReview, getProductReviews, checkReviewed, getAllReviews, getAllHomeReviews, deleteReview, toggleFeaturedReview } from '../controllers/reviewController.js';

const reviewRouter = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

reviewRouter.get('/all-home', getAllHomeReviews);

// User routes
reviewRouter.post('/submit', authUser, upload.single('image'), submitReview);
reviewRouter.get('/product/:productId', getProductReviews);
reviewRouter.get('/check/:productId/:orderId', authUser, checkReviewed);

// Admin routes
reviewRouter.get('/all', authAdmin, getAllReviews);
reviewRouter.patch('/feature/:reviewId', authAdmin, toggleFeaturedReview);
reviewRouter.delete('/:reviewId', authAdmin, deleteReview); 

export default reviewRouter;
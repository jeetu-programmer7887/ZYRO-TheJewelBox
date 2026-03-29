import express from 'express';
import { addToCart, addToWishlist, getUserCart, getWishlist, mergeWishlist, removeWishlist, updateQuantity }
from '../controllers/cartController.js';
import { authUser } from '../middleware/authUser.js';

const cartRouter = express.Router();

//Cart Routes
cartRouter.get('/get', authUser, getUserCart);
cartRouter.post('/add', authUser, addToCart);
cartRouter.patch('/update', authUser, updateQuantity);

//Wishlist Routes
cartRouter.get('/get-wish', authUser, getWishlist);
cartRouter.post('/add-wish', authUser, addToWishlist);
cartRouter.put('/remove', authUser, removeWishlist);
cartRouter.post('/merge-wishlist', authUser, mergeWishlist);

export default cartRouter;
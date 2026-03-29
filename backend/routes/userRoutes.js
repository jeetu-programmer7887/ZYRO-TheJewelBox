import { Router } from "express";
import { authUser } from "../middleware/authUser.js";
import {
    loginUser, registerUser, withGoogle,
    verifyEmail, forgotPassword, verifyForgot,
    resetPassword, logoutUser, updateProfile,
    deleteAccount, getMyProfile
} from "../controllers/userController.js";
const userRouter = Router();

// --- Public Routes without user authentication ---
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/google', withGoogle);
userRouter.post('/verify-email', verifyEmail);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password/verify-otp', verifyForgot);
userRouter.patch('/reset-password', resetPassword);

// --- Protected Routes with user authentication ---
userRouter.get('/me', authUser, getMyProfile); 
userRouter.patch('/update-profile', authUser, updateProfile);
userRouter.delete('/delete-profile', authUser, deleteAccount);
userRouter.post('/logout', logoutUser);

export default userRouter;
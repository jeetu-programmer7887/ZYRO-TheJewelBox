import express from 'express';
import { handleSupportChat } from '../controllers/supportController.js';
import { authUser, optionalUser } from '../middleware/authUser.js'

const supportRouter = express.Router();

supportRouter.post('/chat-login' , authUser, handleSupportChat);
supportRouter.post('/chat', optionalUser, handleSupportChat);

export default supportRouter;
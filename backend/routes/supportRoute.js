import express from 'express';
import { handleSupportChat } from '../controllers/supportController.js';
import {authUser} from '../middleware/authUser.js'

const supportRouter = express.Router();

supportRouter.post('/chat-login' , authUser, handleSupportChat);
supportRouter.post('/chat', handleSupportChat);

export default supportRouter;
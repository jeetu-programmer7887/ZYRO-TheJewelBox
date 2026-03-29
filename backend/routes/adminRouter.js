import { Router } from 'express';
import { authAdmin } from '../middleware/authAdmin.js';
import { addProduct, editProduct, getAdminDetails, getOrders, logoutAdmin, removeProduct, updateOrderStatus, verifyAdmin,
    getDashboardStats, exportOrdersData, contactUs
 } from '../controllers/adminController.js';
import upload from '../middleware/multer.js';

const adminRouter = Router();

// --- Verify Admin ---
adminRouter.post("/verify", verifyAdmin);

// --- Protected Routes ---
adminRouter.get('/me', authAdmin, getAdminDetails);

adminRouter.post('/add',
    authAdmin,
    upload.fields([
        { name: "image1", maxCount: 1 },
        { name: "image2", maxCount: 1 },
        { name: "image3", maxCount: 1 },
        { name: "image4", maxCount: 1 },
    ]), addProduct);

adminRouter.get('/get-orders', authAdmin, getOrders);
adminRouter.patch('/update-order', authAdmin, updateOrderStatus);
adminRouter.delete('/remove/:id', authAdmin, removeProduct);
adminRouter.put('/:id/edit', authAdmin, editProduct);
adminRouter.post('/logout', authAdmin, logoutAdmin);

//Dashboard Routes
adminRouter.get('/stats', authAdmin, getDashboardStats);
adminRouter.get('/export-orders', authAdmin, exportOrdersData);

//Contact
adminRouter.post('/contact', contactUs);

export default adminRouter;
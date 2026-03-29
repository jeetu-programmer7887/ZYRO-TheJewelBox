import express from 'express';
import { listProducts, getStock, analyzeImage, getProductDetails } from '../controllers/productController.js';

const productRouter = express.Router();

productRouter.get("/list", listProducts);
productRouter.get("/stock/:id", getStock);
productRouter.post("/analyze", analyzeImage);
productRouter.get("/details/:id", getProductDetails);

export default productRouter;
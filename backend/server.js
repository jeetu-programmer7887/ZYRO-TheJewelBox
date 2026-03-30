import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import connectDB from './config/mongodb.js';
import userRouter from './routes/userRoutes.js';
import cookieParser from 'cookie-parser';
import productRouter from './routes/productRoutes.js';
import cartRouter from './routes/cartRouter.js';
import orderRouter from './routes/orderRouter.js';
import adminRouter from './routes/adminRouter.js';
import connectCloudinary from './config/cloudinary.js';
import startCronJobs from './config/updateStatus.js';
import supportRouter from './routes/supportRoute.js';
import reviewRouter from './routes/reviewRoutes.js';

// App config
const app = express();
const port = process.env.PORT || 8080;

// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   // origin: "https://7g57xz6f-5173.inc1.devtunnels.ms",
// //   origin: "https://9093xncm-5173.inc1.devtunnels.ms",
//   credentials: true                  
// }));

// Middlewares
app.use(cookieParser());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb',extended:true })); 
app.use(cookieParser());

startCronJobs();
connectCloudinary();
connectDB();

// API endpoints
app.use('/api/user', userRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);
app.use('/api/review', reviewRouter);

app.get('/', (req, res) => {
    res.send('API is working');
})

// start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
})

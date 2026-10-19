import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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
import cronRouter from './routes/cronRoute.js';
import {
  allowedOrigins, originCheck, rejectMongoOperators,
  authLimiter, expensiveLimiter, apiLimiter, chatLimiter,
} from './middleware/security.js';

// Fail fast on missing configuration instead of failing on a customer's request
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

// App config
const app = express();
const port = process.env.PORT || 8080;

// Behind Vercel's / a load balancer's proxy: trust it for client IPs (rate limits)
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  // This server only returns JSON; the shop's pages are served by the frontend.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin) and the configured shop origins
    if (!origin || allowedOrigins().includes(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  maxAge: 86400, // cache preflight responses for a day
}));

// Middlewares
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));
// Razorpay webhooks are verified against the exact raw bytes, so this route
// must get the unparsed body (registered before the JSON parser).
app.use('/api/order/razorpay-webhook', express.raw({ type: '*/*', limit: '1mb' }));
// Product photos for the AI stylist are sent as base64 and need a larger limit
app.use('/api/products/analyze', express.json({ limit: '4mb' }));
app.use(express.json({ limit: '200kb' }));
app.use(rejectMongoOperators);
app.use('/api', originCheck);

// Connect once per instance and make requests wait for it, so the first
// request after a cold start doesn't fail while the connection is opening.
connectCloudinary();
connectDB().catch((error) => console.error('Initial DB connection failed:', error.message));

// Liveness check for uptime monitors (doesn't touch the database)
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, status: 'ok' });
});

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database unavailable:', error.message);
    res.set('Retry-After', '5');
    return res.status(503).json({ success: false, message: 'We are having trouble connecting right now. Please try again in a moment.' });
  }
});
startCronJobs();

// Rate limits
app.use('/api', apiLimiter);
app.use([
  '/api/user/login', '/api/user/register', '/api/user/google', '/api/user/verify-email',
  '/api/user/resend-otp', '/api/user/forgot-password', '/api/user/reset-password',
  '/api/admin/verify',
], authLimiter);
app.use(['/api/products/analyze', '/api/admin/contact'], expensiveLimiter);
app.use('/api/support', chatLimiter);

// API endpoints
app.use('/api/user', userRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);
app.use('/api/review', reviewRouter);
app.use('/api/cron', cronRouter);

app.get('/', (req, res) => {
  res.send('API is working');
});

// Unknown API route
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Central error handler: log details, never leak internals to the client
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'The uploaded data is too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid request body' });
  }
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5 MB)' : 'Invalid upload';
    return res.status(400).json({ success: false, message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID' });
  }
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('Unhandled error:', err);
  return res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// On Vercel the platform invokes the exported app; elsewhere, listen normally.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
  });
}

export default app;

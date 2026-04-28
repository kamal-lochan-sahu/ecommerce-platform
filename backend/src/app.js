import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import errorHandler from './middleware/error.middleware.js';

const app = express();

// ===== Security Middleware =====
app.use(helmet());

app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : process.env.CLIENT_URL,
  credentials: true,
}));

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, message: 'Too many requests, slow down!' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ===== Stripe Webhook — JSON se PEHLE (raw body chahiye) =====
import { stripeWebhook } from './controllers/order.controller.js';
app.post('/api/orders/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// ===== Body Parsers =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ===== Logger (dev only) =====
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Server is running',
    client: process.env.CLIENT_NAME,
    env: process.env.NODE_ENV,
    features: {
      multiVendor: process.env.MULTI_VENDOR === 'true',
      razorpay: process.env.RAZORPAY_ENABLED === 'true',
      stripe: process.env.STRIPE_ENABLED === 'true',
      cod: process.env.COD_ENABLED === 'true',
      loyalty: process.env.LOYALTY_ENABLED === 'true',
      guestCheckout: process.env.GUEST_CHECKOUT === 'true',
    },
  });
});

// ===== Routes (agle din add honge) =====
// import authRoutes from './routes/auth.routes.js';
// app.use('/api/auth', authRoutes);
// Routes ke section mein add karo

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import addressRoutes from './routes/address.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import orderRoutes from './routes/order.routes.js';

import reviewRoutes from './routes/review.routes.js';
import couponRoutes from './routes/coupon.routes.js';
app.use('/api', reviewRoutes);
app.use('/api', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);

// ===== Error Handler (LAST mein hona chahiye) =====
app.use(errorHandler);

export default app;
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { connectCloudinary } from './config/cloudinary.js';
import { getRazorpay } from './config/razorpay.js';
import { getStripe } from './config/stripe.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    connectRedis();
    connectCloudinary();

    if (process.env.RAZORPAY_ENABLED === 'true') {
      getRazorpay();
    }
    if (process.env.STRIPE_ENABLED === 'true') {
      getStripe();
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Client: ${process.env.CLIENT_NAME}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`\n🔗 Health check: http://localhost:${PORT}/health\n`);
    });

  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

startServer();
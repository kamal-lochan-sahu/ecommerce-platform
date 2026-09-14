import logger from './utils/logger.js';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { connectCloudinary } from './config/cloudinary.js';
import { getRazorpay } from './config/razorpay.js';
import { getStripe } from './config/stripe.js';
import { startCronJobs } from './jobs/index.js';

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
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Client: ${process.env.CLIENT_NAME}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
  startCronJobs();
    });

  } catch (error) {
    logger.error('Server failed to start:', error);
    process.exit(1);
  }
};

startServer();
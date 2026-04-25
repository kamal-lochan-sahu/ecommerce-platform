import { Redis } from '@upstash/redis';

let redis;

const connectRedis = () => {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Redis (Upstash) Connected');
    return redis;
  } catch (error) {
    console.error(`❌ Redis Error: ${error.message}`);
  }
};

export { connectRedis, redis };
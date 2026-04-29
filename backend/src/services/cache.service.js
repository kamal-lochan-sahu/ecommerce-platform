import redisClient from "../config/redis.js";

// ─── Cache Keys Constants ─────────────────────────────────────
export const CACHE_KEYS = {
  // Products
  PRODUCT: (id) => `product:${id}`,
  PRODUCTS_LIST: (query) => `products:list:${JSON.stringify(query)}`,
  FEATURED_PRODUCTS: "products:featured",
  NEW_ARRIVALS: "products:new-arrivals",

  // Categories
  CATEGORY: (id) => `category:${id}`,
  CATEGORIES_TREE: "categories:tree",
  CATEGORIES_LIST: "categories:list",

  // User
  USER: (id) => `user:${id}`,
  USER_CART: (id) => `user:${id}:cart`,
  USER_WISHLIST: (id) => `user:${id}:wishlist`,

  // Orders
  ORDER: (id) => `order:${id}`,

  // Banners
  BANNERS_ACTIVE: "banners:active",

  // Coupons
  COUPON: (code) => `coupon:${code.toUpperCase()}`,

  // Analytics
  ANALYTICS_DASHBOARD: "analytics:dashboard",
  ANALYTICS_REVENUE: (period) => `analytics:revenue:${period}`,
};

// ─── TTL Constants (seconds) ─────────────────────────────────
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours
  PRODUCT: 1800,       // 30 minutes
  CATEGORY: 3600,      // 1 hour
  BANNER: 600,         // 10 minutes
  USER: 300,           // 5 minutes
  ANALYTICS: 300,      // 5 minutes
};

// ─── Core Cache Methods ───────────────────────────────────────
export const cacheGet = async (key) => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      console.log(`🟢 Cache HIT: ${key}`);
      return JSON.parse(data);
    }
    console.log(`🔴 Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error(`Cache GET error for ${key}:`, error.message);
    return null; // Cache fail hone pe gracefully handle karo
  }
};

export const cacheSet = async (key, value, ttl = CACHE_TTL.MEDIUM) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`Cache SET error for ${key}:`, error.message);
    return false;
  }
};

export const cacheDel = async (...keys) => {
  try {
    if (keys.length === 0) return 0;
    const count = await redisClient.del(keys);
    console.log(`🗑️ Cache DEL: ${keys.join(", ")} (${count} deleted)`);
    return count;
  } catch (error) {
    console.error("Cache DEL error:", error.message);
    return 0;
  }
};

export const cacheDelPattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;
    const count = await redisClient.del(keys);
    console.log(`🗑️ Cache DEL pattern "${pattern}": ${count} keys deleted`);
    return count;
  } catch (error) {
    console.error("Cache DEL pattern error:", error.message);
    return 0;
  }
};

// ─── Cache-Aside Pattern ─────────────────────────────────────
// Usage: const data = await cacheAside(key, ttl, async () => fetchFromDB())
export const cacheAside = async (key, ttl, fetchFn) => {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttl);
  }
  return fresh;
};

// ─── Cache Invalidation Helpers ──────────────────────────────
export const invalidateProduct = async (productId) => {
  await cacheDel(CACHE_KEYS.PRODUCT(productId));
  await cacheDelPattern("products:list:*");
  await cacheDel(CACHE_KEYS.FEATURED_PRODUCTS);
  await cacheDel(CACHE_KEYS.NEW_ARRIVALS);
};

export const invalidateCategory = async (categoryId) => {
  await cacheDel(CACHE_KEYS.CATEGORY(categoryId));
  await cacheDel(CACHE_KEYS.CATEGORIES_TREE);
  await cacheDel(CACHE_KEYS.CATEGORIES_LIST);
};

export const invalidateUser = async (userId) => {
  await cacheDel(CACHE_KEYS.USER(userId));
  await cacheDel(CACHE_KEYS.USER_CART(userId));
  await cacheDel(CACHE_KEYS.USER_WISHLIST(userId));
};

export const invalidateBanners = async () => {
  await cacheDel(CACHE_KEYS.BANNERS_ACTIVE);
};

export const invalidateCoupon = async (code) => {
  await cacheDel(CACHE_KEYS.COUPON(code));
};

export const invalidateAnalytics = async () => {
  await cacheDelPattern("analytics:*");
};

// ─── Rate Limiting via Redis ──────────────────────────────────
export const checkRateLimit = async (key, maxRequests, windowSeconds) => {
  try {
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }
    return {
      allowed: current <= maxRequests,
      current,
      remaining: Math.max(0, maxRequests - current),
    };
  } catch (error) {
    console.error("Rate limit check error:", error.message);
    return { allowed: true, current: 0, remaining: maxRequests }; // Error pe allow karo
  }
};

// ─── Cache Stats ──────────────────────────────────────────────
export const getCacheStats = async () => {
  try {
    const info = await redisClient.info("stats");
    const keyCount = await redisClient.dbSize();
    return { keyCount, info };
  } catch (error) {
    return { error: error.message };
  }
};

export default {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  aside: cacheAside,
  invalidateProduct,
  invalidateCategory,
  invalidateUser,
  invalidateBanners,
  invalidateCoupon,
  checkRateLimit,
};
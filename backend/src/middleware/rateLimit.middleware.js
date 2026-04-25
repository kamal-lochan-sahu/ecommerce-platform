import rateLimit from 'express-rate-limit';

// Auth ke liye strict limit — brute force se bachao
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // successful requests count nahi honge
});

// OTP ke liye limit
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 10 minutes.',
  },
});
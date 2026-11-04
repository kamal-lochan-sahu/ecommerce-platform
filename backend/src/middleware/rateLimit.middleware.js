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

// OTP *verification* attempts — separate bucket from send-otp so a normal
// "send, mistype, resend, retry" flow never trips the limiter. Only failed
// attempts count, which still stops brute-forcing a 6-digit code.
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many incorrect attempts. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Resending the email-verification code (own bucket, see above)
export const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many code requests. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Guest order banana (bina login) — IP par limit, taaki koi script se stock na rok le.
// Logged-in users par lagu nahi hota (skip).
export const guestOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  skip: (req) => !!req.user,
  message: {
    success: false,
    message: 'Too many orders from this network. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Order tracking (public): order number + phone/email andaaze se na ladaye ja sakein
export const trackOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  message: {
    success: false,
    message: 'Too many tracking attempts. Please try again in a few minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

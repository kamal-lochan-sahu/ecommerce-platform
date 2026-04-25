import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  getMe,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimit.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordSchema && validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// Private routes
router.get('/me', protect, getMe);
router.post('/verify-email', protect, verifyEmail);
router.post('/logout', protect, logout);

export default router;
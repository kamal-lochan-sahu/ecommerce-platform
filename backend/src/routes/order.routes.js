import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  verifyRazorpayPayment,
  createStripeSession,
  stripeWebhook,
  getAllOrders,
  updateOrderStatus,
  markOrderRefunded,
  getInvoicePDF,
} from '../controllers/order.controller.js';
import { sendGuestCheckoutOtp, verifyGuestCheckoutOtp } from '../controllers/guestCheckout.controller.js';
import { otpLimiter, otpVerifyLimiter, guestOrderLimiter } from '../middleware/rateLimit.middleware.js';
import { protect, optionalAuth, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  refundOrderSchema,
  guestSendOtpSchema,
  guestVerifyOtpSchema,
} from '../validators/order.validator.js';
import express from 'express';

const router = Router();

// Stripe webhook — raw body chahiye (no auth needed)
router.post(
  '/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// ── Guest checkout: login ke bina chalne wale routes (protect se PEHLE) ──
// Guest COD ke liye phone OTP
router.post('/guest/send-otp', otpLimiter, validate(guestSendOtpSchema), sendGuestCheckoutOtp);
router.post('/guest/verify-otp', otpVerifyLimiter, validate(guestVerifyOtpSchema), verifyGuestCheckoutOtp);

// Order banana: logged-in (addressId) ya guest (guest object + x-session-id cart).
// optionalAuth + guestOrderLimiter (sirf guest par IP limit lagta hai).
router.post('/', optionalAuth, guestOrderLimiter, validate(createOrderSchema), createOrder);

// Razorpay verify: guest order ke liye login nahi, signed payment hi proof hai (controller me check)
router.post('/payments/razorpay/verify', optionalAuth, verifyRazorpayPayment);

// All routes below require login
router.use(protect);

// Customer routes
router.get('/', getMyOrders);

// Payment routes — /:id se PEHLE define karo
router.post('/payments/stripe/create-session', createStripeSession);

// Admin routes — /:id se PEHLE define karo
router.get('/admin/all', adminOnly, getAllOrders);
router.put('/admin/:id/status', adminOnly, validate(updateOrderStatusSchema), updateOrderStatus);
router.put('/admin/:id/refund', adminOnly, validate(refundOrderSchema), markOrderRefunded);

// Wildcard /:id routes — SABSE LAST mein
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.get('/:id/invoice', getInvoicePDF);

export default router;

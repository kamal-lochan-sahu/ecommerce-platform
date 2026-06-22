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
  getInvoicePDF,
} from '../controllers/order.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from '../validators/order.validator.js';
import express from 'express';

const router = Router();

// Stripe webhook — raw body chahiye (no auth needed)
router.post(
  '/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// All routes below require login
router.use(protect);

// Customer routes
router.post('/', validate(createOrderSchema), createOrder);
router.get('/', getMyOrders);

// Payment routes — /:id se PEHLE define karo
router.post('/payments/razorpay/verify', verifyRazorpayPayment);
router.post('/payments/stripe/create-session', createStripeSession);

// Admin routes — /:id se PEHLE define karo
router.get('/admin/all', adminOnly, getAllOrders);
router.put('/admin/:id/status', adminOnly, validate(updateOrderStatusSchema), updateOrderStatus);

// Wildcard /:id routes — SABSE LAST mein
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.get('/:id/invoice', getInvoicePDF);

export default router;

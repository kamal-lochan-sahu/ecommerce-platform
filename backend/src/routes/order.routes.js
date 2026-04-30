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

// Stripe webhook — raw body chahiye
router.post(
  '/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// Customer routes
router.use(protect);
router.post('/', validate(createOrderSchema), createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

// Payment routes
router.post('/payments/razorpay/verify', verifyRazorpayPayment);
router.post('/payments/stripe/create-session', createStripeSession);

// Invoice route
router.get('/:id/invoice', getInvoicePDF);

// Admin routes
router.get('/admin/all', adminOnly, getAllOrders);
router.put('/admin/:id/status', adminOnly, validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
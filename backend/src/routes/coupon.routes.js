import { Router } from 'express';
import {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon,
  validateCoupon,
} from '../controllers/coupon.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCouponSchema,
  updateCouponSchema,
  applyCouponSchema,
} from '../validators/coupon.validator.js';

const router = Router();

// Admin routes
router.post('/admin/coupons', protect, adminOnly, validate(createCouponSchema), createCoupon);
router.get('/admin/coupons', protect, adminOnly, getAllCoupons);
router.put('/admin/coupons/:id', protect, adminOnly, validate(updateCouponSchema), updateCoupon);
router.delete('/admin/coupons/:id', protect, adminOnly, deleteCoupon);

// User routes
router.post('/coupons/validate', protect, validate(applyCouponSchema), validateCoupon);
router.post('/cart/apply-coupon', protect, validate(applyCouponSchema), applyCoupon);
router.delete('/cart/remove-coupon', protect, removeCoupon);

export default router;
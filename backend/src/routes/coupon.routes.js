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
import { protect, optionalAuth, adminOnly } from '../middleware/auth.middleware.js';
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

// Guest + logged-in (guest ka cart x-session-id se, usage limit order lagte waqt phone se)
router.post('/coupons/validate', optionalAuth, validate(applyCouponSchema), validateCoupon);
router.post('/cart/apply-coupon', optionalAuth, validate(applyCouponSchema), applyCoupon);
router.delete('/cart/remove-coupon', optionalAuth, removeCoupon);

export default router;
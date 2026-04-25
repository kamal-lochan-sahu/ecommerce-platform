import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
} from '../controllers/cart.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  addToCartSchema,
  updateCartSchema,
} from '../validators/cart.validator.js';

const router = Router();

// Guest + Logged-in (optional auth)
router.get('/', optionalAuth, getCart);
router.post('/add', optionalAuth, validate(addToCartSchema), addToCart);
router.put('/update', optionalAuth, validate(updateCartSchema), updateCartItem);
router.delete('/remove', optionalAuth, removeFromCart);
router.delete('/clear', optionalAuth, clearCart);

// Logged-in only
router.post('/merge', protect, mergeCart);

export default router;
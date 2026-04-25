import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  searchProducts,
} from '../controllers/product.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validator.js';

const router = Router();

// Public — specific routes pehle, dynamic baad mein
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);
router.get('/id/:id', protect, adminOnly, getProductById);
router.get('/:slug', getProductBySlug);
router.get('/', getProducts);

// Admin only
router.post('/', protect, adminOnly, upload.array('images', 10), validate(createProductSchema), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 10), validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
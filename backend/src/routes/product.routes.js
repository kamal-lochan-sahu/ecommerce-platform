import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getBrands,
  getAdminProducts,
  searchProducts,
} from '../controllers/product.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { parseJsonFields } from '../middleware/parseJsonFields.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validator.js';
import {
  listVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from '../controllers/variant.controller.js';
import { createVariantSchema, updateVariantSchema } from '../validators/variant.validator.js';

const router = Router();

// Public — specific routes pehle, dynamic baad mein
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);
router.get('/brands', getBrands);
router.get('/admin/list', protect, adminOnly, getAdminProducts);
router.get('/id/:id', protect, adminOnly, getProductById);
router.get('/:slug', getProductBySlug);
router.get('/', getProducts);

// Admin only
router.post('/', protect, adminOnly, upload.array('images', 10), parseJsonFields('tags', 'specifications', 'dimensions', 'meta', 'removeImages'), validate(createProductSchema), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 10), parseJsonFields('tags', 'specifications', 'dimensions', 'meta', 'removeImages'), validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

// Variants (admin CRUD) — Product.price/stock/hasVariants variants se derive hote hain
router.get('/:productId/variants', protect, adminOnly, listVariants);
router.post('/:productId/variants', protect, adminOnly, validate(createVariantSchema), createVariant);
router.put('/:productId/variants/:variantId', protect, adminOnly, validate(updateVariantSchema), updateVariant);
router.delete('/:productId/variants/:variantId', protect, adminOnly, deleteVariant);

export default router;
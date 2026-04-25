import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator.js';

const router = Router();

// Public
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin only
router.post('/', protect, adminOnly, upload.single('image'), validate(createCategorySchema), createCategory);
router.put('/:id', protect, adminOnly, upload.single('image'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;
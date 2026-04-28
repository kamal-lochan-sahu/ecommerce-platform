import { Router } from 'express';
import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful,
} from '../controllers/review.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createReviewSchema, updateReviewSchema } from '../validators/review.validator.js';

const router = Router();

// Product ke reviews
router.get('/products/:productId/reviews', getProductReviews);
router.post('/products/:productId/reviews', protect, validate(createReviewSchema), createReview);

// Review actions
router.put('/reviews/:id', protect, validate(updateReviewSchema), updateReview);
router.delete('/reviews/:id', protect, deleteReview);
router.post('/reviews/:id/helpful', protect, markHelpful);

export default router;
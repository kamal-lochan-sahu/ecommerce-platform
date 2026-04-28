import { Review, Order } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';

// =====================
// @route  POST /api/products/:productId/reviews
// @access Private
// =====================
export const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment, orderId } = req.body;
  const userId = req.user._id;

  // Pehle check karo — already review diya hai kya
  const existing = await Review.findOne({ product: productId, user: userId });
  if (existing) throw new ApiError(400, 'You have already reviewed this product');

  // Verified purchase check
  let isVerifiedPurchase = false;
  if (orderId) {
    const order = await Order.findOne({
      _id: orderId,
      userId,
      'items.product': productId,
      orderStatus: 'delivered',
    });
    if (order) isVerifiedPurchase = true;
  } else {
    // Auto check — koi bhi delivered order mein yeh product hai?
    const order = await Order.findOne({
      userId,
      'items.product': productId,
      orderStatus: 'delivered',
    });
    if (order) isVerifiedPurchase = true;
  }

  const review = await Review.create({
    product: productId,
    user: userId,
    order: orderId || null,
    rating,
    title,
    comment,
    isVerifiedPurchase,
  });

  // Product rating update karo
  await Review.updateProductRating(review.product);

  const populated = await review.populate('user', 'name avatar');

  res.status(201).json(
    new ApiResponse(201, { review: populated }, 'Review added successfully')
  );
});

// =====================
// @route  GET /api/products/:productId/reviews
// @access Public
// =====================
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page, limit, skip } = getPagination(req.query);
  const { rating } = req.query;

  const filter = { product: productId, isApproved: true };
  if (rating) filter.rating = Number(rating);

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    reviews,
    pagination: getPaginationMeta(total, page, limit),
  }, 'Reviews fetched'));
});

// =====================
// @route  PUT /api/reviews/:id
// @access Private
// =====================
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!review) throw new ApiError(404, 'Review not found');

  const { rating, title, comment } = req.body;
  if (rating) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;

  await review.save();
  await Review.updateProductRating(review.product);

  res.json(new ApiResponse(200, { review }, 'Review updated'));
});

// =====================
// @route  DELETE /api/reviews/:id
// @access Private
// =====================
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!review) throw new ApiError(404, 'Review not found');

  const productId = review.product;
  await review.deleteOne();
  await Review.updateProductRating(productId);

  res.json(new ApiResponse(200, null, 'Review deleted'));
});

// =====================
// @route  POST /api/reviews/:id/helpful
// @access Private
// =====================
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  );

  if (!review) throw new ApiError(404, 'Review not found');

  res.json(new ApiResponse(200, { helpfulCount: review.helpfulCount }, 'Marked as helpful'));
});
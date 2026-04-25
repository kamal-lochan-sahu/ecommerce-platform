import { Wishlist, Product } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// =====================
// @route  GET /api/wishlist
// @access Private
// =====================
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user._id })
    .populate({
      path: 'products.product',
      select: 'name slug images price comparePrice stock isActive discountPercent stockStatus ratings',
    });

  if (!wishlist) {
    return res.json(new ApiResponse(200, { products: [] }, 'Wishlist is empty'));
  }

  // Inactive products filter out karo
  const activeProducts = wishlist.products.filter(
    (item) => item.product && item.product.isActive
  );

  res.json(new ApiResponse(200, {
    products: activeProducts,
    total: activeProducts.length,
  }, 'Wishlist fetched'));
});

// =====================
// @route  POST /api/wishlist/add
// @access Private
// =====================
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  // Product exist karta hai?
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  let wishlist = await Wishlist.findOne({ userId: req.user._id });

  if (!wishlist) {
    // Naya wishlist banao
    wishlist = await Wishlist.create({
      userId: req.user._id,
      products: [{ product: productId }],
    });
  } else {
    // Already wishlist mein hai?
    const alreadyExists = wishlist.products.some(
      (item) => item.product.toString() === productId
    );

    if (alreadyExists) {
      throw new ApiError(400, 'Product already in wishlist');
    }

    wishlist.products.push({ product: productId });
    await wishlist.save();
  }

  res.json(new ApiResponse(200, null, 'Product added to wishlist'));
});

// =====================
// @route  DELETE /api/wishlist/remove
// @access Private
// =====================
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const wishlist = await Wishlist.findOne({ userId: req.user._id });
  if (!wishlist) throw new ApiError(404, 'Wishlist not found');

  const initialLength = wishlist.products.length;
  wishlist.products = wishlist.products.filter(
    (item) => item.product.toString() !== productId
  );

  if (wishlist.products.length === initialLength) {
    throw new ApiError(404, 'Product not found in wishlist');
  }

  await wishlist.save();
  res.json(new ApiResponse(200, null, 'Product removed from wishlist'));
});

// =====================
// @route  GET /api/wishlist/check/:productId
// @access Private
// =====================
export const checkWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user._id });

  const isInWishlist = wishlist?.products.some(
    (item) => item.product.toString() === req.params.productId
  ) || false;

  res.json(new ApiResponse(200, { isInWishlist }, 'Wishlist checked'));
});

// =====================
// @route  DELETE /api/wishlist/clear
// @access Private
// =====================
export const clearWishlist = asyncHandler(async (req, res) => {
  await Wishlist.findOneAndUpdate(
    { userId: req.user._id },
    { products: [] }
  );
  res.json(new ApiResponse(200, null, 'Wishlist cleared'));
});
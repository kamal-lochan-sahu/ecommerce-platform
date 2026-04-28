import { Coupon, Cart } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// =====================
// @route  POST /api/admin/coupons
// @access Admin
// =====================
export const createCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) throw new ApiError(400, 'Coupon code already exists');

  const coupon = await Coupon.create(req.body);

  res.status(201).json(
    new ApiResponse(201, { coupon }, 'Coupon created successfully')
  );
});

// =====================
// @route  GET /api/admin/coupons
// @access Admin
// =====================
export const getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, { coupons }, 'Coupons fetched'));
});

// =====================
// @route  PUT /api/admin/coupons/:id
// @access Admin
// =====================
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!coupon) throw new ApiError(404, 'Coupon not found');

  res.json(new ApiResponse(200, { coupon }, 'Coupon updated'));
});

// =====================
// @route  DELETE /api/admin/coupons/:id
// @access Admin
// =====================
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  res.json(new ApiResponse(200, null, 'Coupon deleted'));
});

// =====================
// @route  POST /api/cart/apply-coupon
// @access Private
// =====================
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user._id;

  // Cart fetch karo
  const cart = await Cart.findOne({ userId }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty');
  }

  // Coupon validate karo
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
    expiresAt: { $gt: new Date() },
    startsAt: { $lte: new Date() },
  });

  if (!coupon) throw new ApiError(400, 'Invalid or expired coupon');

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'Coupon usage limit exceeded');
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  if (subtotal < coupon.minOrderAmount) {
    throw new ApiError(400, `Minimum order amount ₹${coupon.minOrderAmount} required`);
  }

  const userUsage = coupon.usedBy.filter(
    (u) => u.userId.toString() === userId.toString()
  ).length;

  if (userUsage >= coupon.usagePerUser) {
    throw new ApiError(400, 'You have already used this coupon');
  }

  // Discount calculate karo
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.value;
  }
  discount = Math.round(discount);

  // Cart mein save karo
  cart.couponCode = coupon.code;
  cart.couponDiscount = discount;
  await cart.save();

  res.json(new ApiResponse(200, {
    couponCode: coupon.code,
    discount,
    subtotal,
    total: subtotal - discount,
    message: `Coupon applied! You save ₹${discount}`,
  }, 'Coupon applied successfully'));
});

// =====================
// @route  DELETE /api/cart/remove-coupon
// @access Private
// =====================
export const removeCoupon = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    { userId: req.user._id },
    { couponCode: null, couponDiscount: 0 }
  );

  res.json(new ApiResponse(200, null, 'Coupon removed'));
});

// =====================
// @route  POST /api/coupons/validate
// @access Private
// =====================
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user._id;

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
    expiresAt: { $gt: new Date() },
    startsAt: { $lte: new Date() },
  });

  if (!coupon) throw new ApiError(400, 'Invalid or expired coupon');

  const userUsage = coupon.usedBy.filter(
    (u) => u.userId.toString() === userId.toString()
  ).length;

  if (userUsage >= coupon.usagePerUser) {
    throw new ApiError(400, 'You have already used this coupon');
  }

  res.json(new ApiResponse(200, {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscount: coupon.maxDiscount,
    description: coupon.description,
  }, 'Coupon is valid'));
});
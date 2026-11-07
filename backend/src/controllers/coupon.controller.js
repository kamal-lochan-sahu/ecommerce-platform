import { Coupon, Cart } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { refreshCartItemPrices } from '../utils/cartPricing.js';
import { priceCoupon, findUsableCoupon, assertWithinPerUserLimit, couponHasScope } from '../services/couponPricing.service.js';

// Logged-in: userId se cart. Guest: x-session-id se cart.
const cartFilterFor = (req) => {
  if (req.user) return { userId: req.user._id };
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) throw new ApiError(400, 'Your cart is empty');
  return { sessionId };
};

// Per-user limit ke liye: logged-in ka userId (+ verified phone se pehle guest ban kar kiya use).
// Guest ka phone abhi pata nahi — uska limit order lagate waqt (phone se) lagta hai.
const whoFor = (req) => (
  req.user
    ? { userId: req.user._id, guestKey: req.user.isPhoneVerified ? req.user.phone : null }
    : null
);

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
  const coupons = await Coupon.find()
    .sort({ createdAt: -1 })
    .populate('applicableProducts', 'name')
    .populate('applicableCategories', 'name');
  res.json(new ApiResponse(200, { coupons }, 'Coupons fetched'));
});

// =====================
// @route  PUT /api/admin/coupons/:id
// @access Admin
// =====================
export const updateCoupon = asyncHandler(async (req, res) => {
  // Update schema mein `type` nahi aata (type badalna allowed nahi), isliye percentage
  // wala 100 cap yahin stored type dekh ke lagate hain.
  if (req.body.value !== undefined) {
    const existing = await Coupon.findById(req.params.id).select('type');
    if (!existing) throw new ApiError(404, 'Coupon not found');
    if (existing.type === 'percentage' && Number(req.body.value) > 100) {
      throw new ApiError(400, 'Percentage discount cannot be more than 100');
    }
  }

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: 'after', runValidators: true }
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
// @access Logged-in ya guest (guest cart x-session-id se)
// =====================
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // Cart fetch karo (variant bhi, taaki live price par discount nikle)
  const cart = await Cart.findOne(cartFilterFor(req)).populate('items.product').populate('items.variant');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty');
  }

  // Cart ka saved price purana ho sakta hai — order live price par banta hai, discount bhi wahi se
  refreshCartItemPrices(cart);

  // Validate + scope + discount: shared service (order create bhi yahi use karta hai)
  const { coupon, discount, subtotal, eligibleSubtotal, scoped } = await priceCoupon({
    code,
    items: cart.items,
    who: whoFor(req),
  });

  // Cart mein save karo
  cart.couponCode = coupon.code;
  cart.couponDiscount = discount;
  await cart.save();

  res.json(new ApiResponse(200, {
    couponCode: coupon.code,
    discount,
    subtotal,
    eligibleSubtotal,
    scoped,
    total: subtotal - discount,
    message: scoped
      ? `Coupon applied! You save ₹${discount} on eligible items`
      : `Coupon applied! You save ₹${discount}`,
  }, 'Coupon applied successfully'));
});

// =====================
// @route  DELETE /api/cart/remove-coupon
// @access Logged-in ya guest
// =====================
export const removeCoupon = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    cartFilterFor(req),
    { couponCode: null, couponDiscount: 0 }
  );

  res.json(new ApiResponse(200, null, 'Coupon removed'));
});

// =====================
// @route  POST /api/coupons/validate
// @access Logged-in ya guest
// =====================
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const coupon = await findUsableCoupon(code);
  assertWithinPerUserLimit(coupon, whoFor(req));

  res.json(new ApiResponse(200, {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscount: coupon.maxDiscount,
    description: coupon.description,
    scoped: couponHasScope(coupon),
  }, 'Coupon is valid'));
});

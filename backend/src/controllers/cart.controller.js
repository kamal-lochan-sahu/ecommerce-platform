import { Cart, Product, ProductVariant } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Helper — cart dhundho ya banao
const getOrCreateCart = async (userId, sessionId) => {
  let cart;

  if (userId) {
    cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }
  } else if (sessionId) {
    cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = await Cart.create({ sessionId, items: [] });
    }
  } else {
    throw new ApiError(400, 'User ID or Session ID required');
  }

  return cart;
};

// Helper — cart populate karke return karo
const getPopulatedCart = async (cartId) => {
  return await Cart.findById(cartId).populate({
    path: 'items.product',
    select: 'name slug images price comparePrice stock isActive stockStatus discountPercent',
  }).populate({
    path: 'items.variant',
    select: 'name price stock options',
  });
};

// =====================
// @route  GET /api/cart
// @access Public (guest + logged in)
// =====================
export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'];

  if (!userId && !sessionId) {
    return res.json(new ApiResponse(200, { cart: null, items: [], totalAmount: 0, totalItems: 0 }, 'Cart is empty'));
  }

  const filter = userId ? { userId } : { sessionId };
  const cart = await Cart.findOne(filter).populate({
    path: 'items.product',
    select: 'name slug images price comparePrice stock isActive',
  }).populate({
    path: 'items.variant',
    select: 'name price stock options',
  });

  if (!cart || cart.items.length === 0) {
    return res.json(new ApiResponse(200, {
      cart: null,
      items: [],
      totalAmount: 0,
      totalItems: 0,
    }, 'Cart is empty'));
  }

  res.json(new ApiResponse(200, {
    cart,
    totalAmount: cart.totalAmount,
    totalItems: cart.totalItems,
  }, 'Cart fetched'));
});

// =====================
// @route  POST /api/cart/add
// @access Public (guest + logged in)
// =====================
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'];

   if (!userId && !sessionId) {

    throw new ApiError(400, 'Session ID required for guest cart');
  }

  // Product exist karta hai?
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found');
  }

  // Variant check
  let variant = null;
  let itemPrice = product.price;

  if (variantId) {
    variant = await ProductVariant.findById(variantId);
    if (!variant || !variant.isActive) {
      throw new ApiError(404, 'Variant not found');
    }
    itemPrice = variant.price;

    // Variant stock check
    if (variant.stock < quantity) {
      throw new ApiError(400, `Only ${variant.stock} items available in stock`);
    }
  } else {
    // Product stock check
    if (product.stock < quantity) {
      throw new ApiError(400, `Only ${product.stock} items available in stock`);
    }
  }

  const cart = await getOrCreateCart(userId, sessionId);

  // Already cart mein hai?
  const existingItemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      (variantId ? item.variant?.toString() === variantId : !item.variant)
  );

  if (existingItemIndex > -1) {
    // Quantity update karo
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    const maxStock = variant ? variant.stock : product.stock;

    if (newQuantity > maxStock) {
      throw new ApiError(400, `Only ${maxStock} items available in stock`);
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Naya item add karo
    cart.items.push({
      product: productId,
      variant: variantId || null,
      quantity,
      price: itemPrice,
    });
  }

  await cart.save();
  const populatedCart = await getPopulatedCart(cart._id);

  res.json(new ApiResponse(200, {
    cart: populatedCart,
    totalAmount: populatedCart.totalAmount,
    totalItems: populatedCart.totalItems,
  }, 'Item added to cart'));
});

// =====================
// @route  PUT /api/cart/update
// @access Public (guest + logged in)
// =====================
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity } = req.body;
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'];

  const filter = userId ? { userId } : { sessionId };
  const cart = await Cart.findOne(filter);

  if (!cart) throw new ApiError(404, 'Cart not found');

  const itemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId &&
      (variantId ? item.variant?.toString() === variantId : !item.variant)
  );

  if (itemIndex === -1) throw new ApiError(404, 'Item not found in cart');

  // Stock check
  const product = await Product.findById(productId);
  const maxStock = variantId
    ? (await ProductVariant.findById(variantId))?.stock
    : product?.stock;

  if (quantity > maxStock) {
    throw new ApiError(400, `Only ${maxStock} items available`);
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  const populatedCart = await getPopulatedCart(cart._id);

  res.json(new ApiResponse(200, {
    cart: populatedCart,
    totalAmount: populatedCart.totalAmount,
    totalItems: populatedCart.totalItems,
  }, 'Cart updated'));
});

// =====================
// @route  DELETE /api/cart/remove
// @access Public (guest + logged in)
// =====================
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.body;
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'];

  const filter = userId ? { userId } : { sessionId };
  const cart = await Cart.findOne(filter);

  if (!cart) throw new ApiError(404, 'Cart not found');

  cart.items = cart.items.filter(
    (item) =>
      !(
        item.product.toString() === productId &&
        (variantId ? item.variant?.toString() === variantId : !item.variant)
      )
  );

  await cart.save();
  const populatedCart = await getPopulatedCart(cart._id);

  res.json(new ApiResponse(200, {
    cart: populatedCart,
    totalAmount: populatedCart.totalAmount,
    totalItems: populatedCart.totalItems,
  }, 'Item removed from cart'));
});

// =====================
// @route  DELETE /api/cart/clear
// @access Public (guest + logged in)
// =====================
export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'];

  const filter = userId ? { userId } : { sessionId };
  await Cart.findOneAndUpdate(filter, {
    items: [],
    couponCode: null,
    couponDiscount: 0,
  });

  res.json(new ApiResponse(200, null, 'Cart cleared'));
});

// =====================
// @route  POST /api/cart/merge
// @access Private (login ke baad call karo)
// =====================
export const mergeCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessionId = req.headers['x-session-id'];

  if (!sessionId) {
    return res.json(new ApiResponse(200, null, 'No guest cart to merge'));
  }

  const guestCart = await Cart.findOne({ sessionId });
  if (!guestCart || guestCart.items.length === 0) {
    return res.json(new ApiResponse(200, null, 'Guest cart is empty'));
  }

  let userCart = await Cart.findOne({ userId });
  if (!userCart) {
    // Guest cart ko user cart bana do
    guestCart.userId = userId;
    guestCart.sessionId = null;
    await guestCart.save();
    return res.json(new ApiResponse(200, null, 'Cart merged successfully'));
  }

  // Dono carts hain — merge karo
  for (const guestItem of guestCart.items) {
    const existingIndex = userCart.items.findIndex(
      (item) =>
        item.product.toString() === guestItem.product.toString() &&
        item.variant?.toString() === guestItem.variant?.toString()
    );

    if (existingIndex > -1) {
      userCart.items[existingIndex].quantity += guestItem.quantity;
    } else {
      userCart.items.push(guestItem);
    }
  }

  await userCart.save();
  await Cart.findOneAndDelete({ sessionId }); // Guest cart delete karo

  res.json(new ApiResponse(200, null, 'Cart merged successfully'));
});
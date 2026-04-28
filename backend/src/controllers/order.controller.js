import crypto from 'crypto';
import { Order, Cart, Product, Address, Coupon, Transaction, LoyaltyPoints, Notification } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getRazorpay } from '../config/razorpay.js';
import { getStripe } from '../config/stripe.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';
import { sendEmail } from '../utils/email.js';

// =====================
// Helper — coupon validate karo
// =====================
const validateCoupon = async (code, userId, subtotal) => {
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

  return { coupon, discount: Math.round(discount) };
};

// =====================
// @route  POST /api/orders
// @access Private
// =====================
export const createOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod, couponCode, notes } = req.body;
  const userId = req.user._id;

  // Payment method enabled check
  if (paymentMethod === 'razorpay' && process.env.RAZORPAY_ENABLED !== 'true') {
    throw new ApiError(400, 'Razorpay is not enabled');
  }
  if (paymentMethod === 'stripe' && process.env.STRIPE_ENABLED !== 'true') {
    throw new ApiError(400, 'Stripe is not enabled');
  }
  if (paymentMethod === 'cod' && process.env.COD_ENABLED !== 'true') {
    throw new ApiError(400, 'Cash on delivery is not available');
  }

  // Cart fetch karo
  const cart = await Cart.findOne({ userId }).populate('items.product').populate('items.variant');

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty');
  }

  // Address fetch karo
  const address = await Address.findOne({ _id: addressId, userId });
  if (!address) throw new ApiError(404, 'Address not found');

  // Stock validate karo
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      throw new ApiError(400, `Product "${product?.name}" is no longer available`);
    }

    const availableStock = item.variant ? item.variant.stock : product.stock;
    if (availableStock < item.quantity) {
      throw new ApiError(400, `Only ${availableStock} units of "${product.name}" available`);
    }
  }

  // Pricing calculate karo
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  const shippingCharge = subtotal >= 500 ? 0 : 49; // Free shipping above ₹500
  const tax = Math.round(subtotal * 0.18); // 18% GST

  // Coupon
  let couponDiscount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode, userId, subtotal);
    couponDiscount = result.discount;
    appliedCoupon = result.coupon;
  }

  const total = subtotal + shippingCharge + tax - couponDiscount;

  // Address snapshot
  const shippingAddress = {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
  };

  // Order items with price snapshot
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    variant: item.variant?._id || null,
    name: item.product.name,
    image: item.product.images?.[0] || '',
    price: item.price,
    quantity: item.quantity,
    total: item.price * item.quantity,
  }));

  // Order create karo
  const order = await Order.create({
    userId,
    items: orderItems,
    shippingAddress,
    pricing: {
      subtotal,
      shippingCharge,
      tax,
      couponDiscount,
      total,
    },
    couponCode: couponCode || null,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    orderStatus: 'placed',
    statusHistory: [{ status: 'placed', message: 'Order placed successfully' }],
    notes,
    expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
  });

  // Stock reduce karo
  for (const item of cart.items) {
    if (item.variant) {
      await item.variant.updateOne({ $inc: { stock: -item.quantity } });
    } else {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity, totalSold: item.quantity },
      });
    }
  }

  // Coupon use mark karo
  if (appliedCoupon) {
    await Coupon.findByIdAndUpdate(appliedCoupon._id, {
      $inc: { usedCount: 1 },
      $push: { usedBy: { userId } },
    });
  }

  // Cart clear karo
  await Cart.findOneAndUpdate({ userId }, { items: [], couponCode: null, couponDiscount: 0 });

  // Loyalty points add karo (1 point per ₹10)
  if (process.env.LOYALTY_ENABLED === 'true') {
    const pointsEarned = Math.floor(total / 10);
    await LoyaltyPoints.findOneAndUpdate(
      { userId },
      {
        $inc: { totalPoints: pointsEarned, lifetimePoints: pointsEarned },
        $push: {
          transactions: {
            type: 'earned',
            points: pointsEarned,
            description: `Order ${order.orderNumber}`,
            orderId: order._id,
          },
        },
      },
      { upsert: true }
    );
  }

  // Notification create karo
  await Notification.create({
    userId,
    title: 'Order Placed! 🎉',
    message: `Your order ${order.orderNumber} has been placed successfully.`,
    type: 'order',
    link: `/orders/${order._id}`,
  });

  // COD — directly confirm karo
  if (paymentMethod === 'cod') {
    return res.status(201).json(
      new ApiResponse(201, { order }, 'Order placed successfully')
    );
  }

 // Stripe — order banao, session alag se banega
  if (paymentMethod === 'stripe') {
    return res.status(201).json(
      new ApiResponse(201, {
        order,
        nextStep: 'create-stripe-session',
        createSessionUrl: `/api/orders/payments/stripe/create-session`,
      }, 'Order created — proceed to Stripe payment')
    );
  }

  // Online payment — Razorpay order banao
  if (paymentMethod === 'razorpay') {
    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create({
      amount: total * 100, // paise mein
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: order._id.toString() },
    });

    // Transaction record
    await Transaction.create({
      order: order._id,
      user: userId,
      amount: total,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: razorpayOrder.id,
      status: 'initiated',
    });

    return res.status(201).json(
      new ApiResponse(201, {
        order,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID,
        },
      }, 'Order created — proceed to payment')
    );
  }
});

// =====================
// @route  POST /api/payments/razorpay/verify
// @access Private
// =====================
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body;

  // Signature verify karo
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    // Payment failed — order update karo
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'failed',
      orderStatus: 'cancelled',
      $push: {
        statusHistory: { status: 'cancelled', message: 'Payment verification failed' },
      },
    });

    await Transaction.findOneAndUpdate(
      { gatewayOrderId: razorpay_order_id },
      { status: 'failed' }
    );

    throw new ApiError(400, 'Payment verification failed');
  }

  // Payment success — order update karo
  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      $push: {
        statusHistory: { status: 'confirmed', message: 'Payment received successfully' },
      },
    },
    { new: true }
  );

  // Transaction update karo
  await Transaction.findOneAndUpdate(
    { gatewayOrderId: razorpay_order_id },
    {
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      status: 'success',
    }
  );

  // Notification
  await Notification.create({
    userId: order.userId,
    title: 'Payment Successful! ✅',
    message: `Payment for order ${order.orderNumber} confirmed.`,
    type: 'payment',
    link: `/orders/${order._id}`,
  });

  res.json(new ApiResponse(200, { order }, 'Payment verified successfully'));
});

// =====================
// @route  GET /api/orders
// @access Private
// =====================
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status } = req.query;

  const filter = { userId: req.user._id };
  if (status) filter.orderStatus = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-items.image'),
    Order.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    orders,
    pagination: getPaginationMeta(total, page, limit),
  }, 'Orders fetched'));
});

// =====================
// @route  GET /api/orders/:id
// @access Private
// =====================
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  }).populate('items.product', 'name slug images');

  if (!order) throw new ApiError(404, 'Order not found');

  res.json(new ApiResponse(200, { order }, 'Order fetched'));
});

// =====================
// @route  PUT /api/orders/:id/cancel
// @access Private
// =====================
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!order) throw new ApiError(404, 'Order not found');

  // Sirf placed/confirmed cancel ho sakta hai
  if (!['placed', 'confirmed'].includes(order.orderStatus)) {
    throw new ApiError(400, `Cannot cancel order in "${order.orderStatus}" status`);
  }

  // Stock wapas karo
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, totalSold: -item.quantity },
    });
  }

  await Order.findByIdAndUpdate(order._id, {
    orderStatus: 'cancelled',
    cancelReason: reason || 'Cancelled by customer',
    $push: {
      statusHistory: {
        status: 'cancelled',
        message: reason || 'Cancelled by customer',
      },
    },
  });

  res.json(new ApiResponse(200, null, 'Order cancelled successfully'));
});

// =====================
// @route  GET /api/admin/orders
// @access Admin
// =====================
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, paymentStatus, search } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    orders,
    pagination: getPaginationMeta(total, page, limit),
  }, 'All orders fetched'));
});

// =====================
// @route  PUT /api/admin/orders/:id/status
// @access Admin
// =====================
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, message, trackingNumber, courier, trackingUrl } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const updateData = {
    orderStatus: status,
    $push: {
      statusHistory: {
        status,
        message: message || `Order ${status}`,
      },
    },
  };

  if (status === 'delivered') {
    updateData.deliveredAt = new Date();
    updateData.paymentStatus = 'paid';
  }

  if (trackingNumber) {
    updateData.tracking = { trackingNumber, courier, trackingUrl };
  }

  const updated = await Order.findByIdAndUpdate(order._id, updateData, { new: true });

  // Customer ko notification bhejo
  await Notification.create({
    userId: order.userId,
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: message || `Your order ${order.orderNumber} is ${status}`,
    type: 'order',
    link: `/orders/${order._id}`,
  });

  res.json(new ApiResponse(200, { order: updated }, 'Order status updated'));
});

// =====================
// @route  POST /api/orders/payments/stripe/create-session
// @access Private
// =====================
export const createStripeSession = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.paymentStatus === 'paid') {
    throw new ApiError(400, 'Order already paid');
  }

  const stripe = getStripe();

  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: 'inr',
      product_data: {
        name: item.name,
        images: item.image ? [item.image] : [],
      },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  }));

  if (order.pricing.shippingCharge > 0) {
    lineItems.push({
      price_data: {
        currency: 'inr',
        product_data: { name: 'Shipping Charge' },
        unit_amount: order.pricing.shippingCharge * 100,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/order-success?orderId=${order._id}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout?cancelled=true`,
    metadata: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: req.user._id.toString(),
    },
  });

  await Transaction.create({
    order: order._id,
    user: req.user._id,
    amount: order.pricing.total,
    currency: 'INR',
    gateway: 'stripe',
    gatewayOrderId: session.id,
    status: 'initiated',
  });

  res.json(new ApiResponse(200, {
    sessionId: session.id,
    sessionUrl: session.url,
  }, 'Stripe session created'));
});

// =====================
// @route  POST /api/orders/payments/stripe/webhook
// @access Public
// =====================
export const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const stripe = getStripe();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata.orderId;

      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        $push: {
          statusHistory: {
            status: 'confirmed',
            message: 'Payment received via Stripe',
          },
        },
      });

      await Transaction.findOneAndUpdate(
        { gatewayOrderId: session.id },
        {
          gatewayPaymentId: session.payment_intent,
          status: 'success',
        }
      );

      console.log(`✅ Stripe payment confirmed: ${orderId}`);
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;
      const orderId = session.metadata.orderId;

      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed',
        orderStatus: 'cancelled',
        $push: {
          statusHistory: {
            status: 'cancelled',
            message: 'Stripe session expired',
          },
        },
      });

      console.log(`❌ Stripe session expired: ${orderId}`);
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  res.json({ received: true });
});
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Order, Cart, Product, ProductVariant, Address, Coupon, Transaction, LoyaltyPoints, Notification, Settings } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
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

  // Stock validate karo — friendly early error. NOT the authoritative check:
  // stock can still change between this read and the atomic decrement below,
  // so the real guard is the conditional $gte update inside the transaction.
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

  // Pricing calculate karo — Settings se live values lo (admin panel se
  // configurable), hardcoded nahi. Frontend checkout bhi /api/settings/public
  // se yehi values padhta hai taaki displayed total aur actually charged
  // total hamesha match kare.
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  const settings = await Settings.getSingleton();
  const shippingCharge = subtotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryFee;
  const tax = Math.round(subtotal * (settings.taxRate / 100));

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

  // ── Order create + stock decrement + coupon usage + cart clear ─ sab ek
  // MongoDB transaction mein karte hain, taaki concurrent orders same product
  // ko oversell na kar sakein. Stock decrement conditional hai ($gte guard) ─
  // isse race condition mein bhi stock kabhi negative nahi ho sakta, chahe
  // do requests exact same moment pe last unit ke liye race kar rahe hon.
  // NOTE: requires a replica-set MongoDB (MongoDB Atlas already is one;
  // a bare standalone local `mongod` does NOT support transactions).
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      for (const item of cart.items) {
        if (item.variant) {
          const updated = await ProductVariant.findOneAndUpdate(
            { _id: item.variant._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session, new: true }
          );
          if (!updated) {
            throw new ApiError(400, `"${item.product.name}" ─ not enough stock left`);
          }
          // Variant stock ProductVariant pe hai, lekin totalSold hum hamesha
          // parent Product pe track karte hain (admin "top products" analytics
          // isi field se aata hai) — warna variant products kabhi top-sellers
          // mein nahi dikhte.
          await Product.findByIdAndUpdate(
            item.product._id,
            { $inc: { totalSold: item.quantity } },
            { session }
          );
        } else {
          const updated = await Product.findOneAndUpdate(
            { _id: item.product._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity, totalSold: item.quantity } },
            { session, new: true }
          );
          if (!updated) {
            throw new ApiError(400, `"${item.product.name}" ─ not enough stock left`);
          }
        }
      }

      const created = await Order.create([{
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
        paymentStatus: 'pending',
        orderStatus: 'placed',
        statusHistory: [{ status: 'placed', message: 'Order placed successfully' }],
        notes,
        expectedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      }], { session });
      order = created[0];

      // Coupon use mark karo
      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(
          appliedCoupon._id,
          { $inc: { usedCount: 1 }, $push: { usedBy: { userId } } },
          { session }
        );
      }

      // Cart clear karo
      await Cart.findOneAndUpdate(
        { userId },
        { items: [], couponCode: null, couponDiscount: 0 },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

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
  } = req.body;

  // SECURITY: never trust a client-supplied orderId here. The signature
  // only certifies (razorpay_order_id + razorpay_payment_id) — it says
  // nothing about which of OUR orders should be marked paid. That link
  // must come from OUR OWN Transaction record (created server-side when
  // the Razorpay order was created), never from the request body.
  // Without this lookup, a user could complete a real payment for a
  // cheap order of their own, then replay that valid signature with a
  // different `orderId` in the body to fraudulently mark someone else's
  // (or their own bigger) order as paid without actually paying for it.
  const transaction = await Transaction.findOne({
    gatewayOrderId: razorpay_order_id,
    gateway: 'razorpay',
  });

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found for this payment');
  }

  const orderId = transaction.order;

  // Ownership check — sirf apna order verify kar sakta hai
  const orderCheck = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!orderCheck) {
    throw new ApiError(404, 'Order not found');
  }

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

  // Stock wapas karo — variant wale item ka stock ProductVariant pe wapas
  // jana chahiye (wahi se order ke time kata tha), Product.stock pe nahi.
  // totalSold hamesha Product pe hi decrement hota hai (variant purchases bhi
  // ab createOrder mein Product.totalSold increment karte hain, isliye symmetric hai).
  for (const item of order.items) {
    if (item.variant) {
      await ProductVariant.findByIdAndUpdate(item.variant, {
        $inc: { stock: item.quantity },
      });
      await Product.findByIdAndUpdate(item.product, {
        $inc: { totalSold: -item.quantity },
      });
    } else {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, totalSold: -item.quantity },
      });
    }
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
    logger.error('Webhook signature failed:', err.message);
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

      logger.info(`Stripe payment confirmed: ${orderId}`);
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

      logger.warn(`Stripe session expired: ${orderId}`);
      break;
    }

    default:
      logger.warn(`Unhandled Stripe event: ${event.type}`);
  }

  res.json({ received: true });
});


// ─── GET INVOICE PDF ──────────────────────────────────────────
export const getInvoicePDF = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product", "name price images");

  // Null-check BEFORE touching order.userId — previously this read
  // order.userId one line below the check that guards against it, so an
  // invalid/deleted order id crashed with a raw 500 instead of a clean 404.
  if (!order) throw new ApiError(404, "Order not found");

  const user = await (await import("../models/user.model.js")).default
    .findById(order.userId)
    .select("name email phone");

  // Sirf apna order dekh sakta hai (admin sab dekh sakta hai)
  if (
    order.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Not authorized");
  }

  const generateInvoicePDF = (await import("../utils/pdf.js")).default;
  const pdfBuffer = await generateInvoicePDF(order, user);

  const shortId = order._id.toString().slice(-8).toUpperCase();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="invoice-${shortId}.pdf"`,
    "Content-Length": pdfBuffer.length,
  });

  res.send(pdfBuffer);
});
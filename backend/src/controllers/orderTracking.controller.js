import { Order, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isPlaceholderEmail } from '../utils/identity.js';

// "9876543210", "+91 98765 43210" ya "a@b.com" -> { phone } ya { email }
export const normalizeContact = (raw) => {
  const s = String(raw || '').trim();
  if (s.includes('@')) return { email: s.toLowerCase() };
  const digits = s.replace(/\D/g, '');
  return digits.length >= 10 ? { phone: digits.slice(-10) } : {};
};

// Order ke saath jude sab contact (guest ka, ya registered customer ka) — inme se koi ek match ho
const contactsOf = async (order) => {
  const emails = new Set();
  const phones = new Set();
  const add = (set, v) => { if (v) set.add(String(v).trim().toLowerCase()); };

  add(emails, order.guestContact?.email);
  add(phones, order.guestContact?.phone);
  add(phones, order.shippingAddress?.phone);

  if (order.userId) {
    const user = await User.findById(order.userId).select('email phone isPhoneVerified').lean();
    if (user) {
      if (user.email && !isPlaceholderEmail(user.email)) add(emails, user.email);
      if (user.isPhoneVerified) add(phones, user.phone);
    }
  }
  return { emails, phones };
};

// Public ke liye sirf zaroori, safe fields. Poora address, naam, email, phone, payment ids kuch nahi.
const toPublicOrder = (order) => ({
  orderNumber: order.orderNumber,
  orderStatus: order.orderStatus,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt,
  expectedDelivery: order.expectedDelivery,
  deliveredAt: order.deliveredAt,
  items: (order.items || []).map((i) => ({
    name: i.name,
    variantLabel: i.variantLabel || '',
    image: i.image,
    quantity: i.quantity,
    price: i.price,
  })),
  pricing: {
    subtotal: order.pricing?.subtotal,
    shippingCharge: order.pricing?.shippingCharge,
    couponDiscount: order.pricing?.couponDiscount,
    tax: order.pricing?.tax,
    total: order.pricing?.total,
  },
  shippingTo: {
    city: order.shippingAddress?.city,
    state: order.shippingAddress?.state,
    pincode: order.shippingAddress?.pincode,
  },
  tracking: order.tracking
    ? {
        courier: order.tracking.courier,
        trackingNumber: order.tracking.trackingNumber,
        trackingUrl: order.tracking.trackingUrl,
      }
    : undefined,
  statusHistory: (order.statusHistory || []).map((h) => ({
    status: h.status,
    message: h.message,
    timestamp: h.timestamp,
  })),
});

// =====================
// @route  POST /api/orders/track
// @access Public (rate-limited)
// Order number + order ka phone ya email (dono sahi hon tabhi) — login ke bina status dekhna.
// Galat order number aur galat contact dono par ek hi jawab: kisi ko pata na chale ki order exist karta hai.
// =====================
export const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, contact } = req.body;
  const given = normalizeContact(contact);

  const notFound = new ApiError(404, "We couldn't find an order with these details. Check the order number and the phone or email used for the order.");

  const order = await Order.findOne({ orderNumber }).lean();
  if (!order || (!given.email && !given.phone)) throw notFound;

  const { emails, phones } = await contactsOf(order);
  const ok = (given.email && emails.has(given.email)) || (given.phone && phones.has(given.phone));
  if (!ok) throw notFound;

  res.json(new ApiResponse(200, { order: toPublicOrder(order) }, 'Order found'));
});

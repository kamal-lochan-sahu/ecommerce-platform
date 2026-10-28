import mongoose from 'mongoose';
import { Order, Product, ProductVariant, Coupon, Notification, User } from '../models/index.js';
import logger from '../utils/logger.js';
import { sendOrderConfirmationEmail } from './email.service.js';
import { notifyOrderEventInBackground } from './orderNotifications.service.js';

// ─────────────────────────────────────────────────────────────
// Order lifecycle — ONE place for "cancel an order" and "mark an
// order paid", so every caller behaves the same way.
//
// Why this exists: an order used to be cancelled from 4 different places
// (customer cancel, admin status change, Razorpay signature mismatch,
// Stripe session expired) and only one of them gave the stock back.
// Everything that cancels now goes through cancelOrderAndRestore().
// ─────────────────────────────────────────────────────────────

// Stock + totalSold wapas karo — createOrder ka exact ulta.
// Variant item: stock ProductVariant pe wapas, totalSold hamesha parent Product pe.
const restoreStock = async (order, session) => {
  for (const item of order.items) {
    if (item.variant) {
      await ProductVariant.findByIdAndUpdate(item.variant, { $inc: { stock: item.quantity } }, { session });
      await Product.findByIdAndUpdate(item.product, { $inc: { totalSold: -item.quantity } }, { session });
    } else {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity, totalSold: -item.quantity } },
        { session }
      );
    }
  }
};

// Coupon ka ek use wapas karo: usedCount -1 aur usedBy se is user ki EK entry hatao
// ($pull saari matching entries hata deta, usagePerUser > 1 mein galat hota).
const releaseCoupon = async (order, session) => {
  if (!order.couponCode) return;

  const coupon = await Coupon.findOne({ code: String(order.couponCode).toUpperCase() }).session(session || null);
  if (!coupon) return;

  const wasExhausted = !!coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;

  let idx = -1;
  for (let i = coupon.usedBy.length - 1; i >= 0; i--) {
    if (String(coupon.usedBy[i].userId) === String(order.userId)) { idx = i; break; }
  }
  if (idx === -1) return; // is order ne coupon use mark hi nahi kiya tha — kuch revert nahi

  coupon.usedBy.splice(idx, 1);
  coupon.usedCount = Math.max(0, coupon.usedCount - 1);

  // expireCoupons cron limit poori hone pe coupon ko isActive=false kar deta hai.
  // Cancel se jagah khaali hui to wapas active karo (agar expire nahi hua).
  if (wasExhausted && !coupon.isActive && coupon.expiresAt > new Date()) {
    coupon.isActive = true;
  }

  await coupon.save({ session });
};

// ─────────────────────────────────────────────────────────────
// cancelOrderAndRestore
//
// Atomic: order ko "cancelled" claim karna + stock restore + coupon revert
// ek MongoDB transaction mein. Do cancels ek saath aaye to sirf ek jeetega
// (claim ka filter orderStatus pe hai), isliye stock kabhi double-restore nahi hota.
//
// opts:
//   allowedFrom      — orderStatus values jinse cancel allowed hai (required)
//   reason           — cancelReason + statusHistory message
//   userId           — (optional) sirf is user ka order (customer cancel)
//   onlyIfUnpaid     — paid order ko cancel mat karo (gateway failure/expiry paths)
//   markPaymentFailed— paymentStatus 'failed' set karo (unpaid online orders)
//   notify           — customer ko in-app notification bhejo
//
// Returns { cancelled: boolean, order }   (cancelled=false => kuch change nahi hua)
// ─────────────────────────────────────────────────────────────
export const cancelOrderAndRestore = async (orderId, opts) => {
  const {
    allowedFrom,
    reason = 'Order cancelled',
    userId = null,
    onlyIfUnpaid = false,
    markPaymentFailed = false,
    notify = false,
  } = opts;

  const filter = { _id: orderId, orderStatus: { $in: allowedFrom } };
  if (userId) filter.userId = userId;
  if (onlyIfUnpaid) filter.paymentStatus = { $nin: ['paid', 'refunded'] };

  const update = {
    orderStatus: 'cancelled',
    cancelReason: reason,
    $push: { statusHistory: { status: 'cancelled', message: reason } },
  };
  if (markPaymentFailed) update.paymentStatus = 'failed';

  const session = await mongoose.startSession();
  let result = { cancelled: false, order: null };
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(filter, update, { returnDocument: 'after', session });
      if (!order) {
        result = { cancelled: false, order: null };
        return;
      }
      await restoreStock(order, session);
      await releaseCoupon(order, session);
      result = { cancelled: true, order };
    });
  } finally {
    await session.endSession();
  }

  if (result.cancelled && notify) {
    try {
      await Notification.create({
        userId: result.order.userId,
        title: 'Order Cancelled',
        message: `Your order ${result.order.orderNumber} was cancelled. ${reason}`,
        type: 'order',
        link: `/orders/${result.order._id}`,
      });
    } catch (err) {
      logger.error(`Cancel notification failed for ${orderId}: ${err.message}`);
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────────
// Confirmation email (fire-and-forget; kabhi order flow ko fail nahi karta)
// ─────────────────────────────────────────────────────────────
export const sendConfirmationEmailFor = (order) => {
  User.findById(order.userId)
    .select('name email')
    .then((user) => (user ? sendOrderConfirmationEmail(order, user) : null))
    .catch((err) => logger.error(`Order confirmation email failed for ${order._id}: ${err.message}`));
  // Confirmation SMS (COD: order lagte hi, online: payment milte hi - dono yahin se guzarte hain)
  notifyOrderEventInBackground('placed', order);
};

// ─────────────────────────────────────────────────────────────
// markOrderPaid — Razorpay verify, Razorpay webhook aur Stripe webhook teeno yahi use karte hain.
//
// Atomic claim: sirf pehla caller order ko paid karta hai (verify + webhook
// ek saath aaye to bhi notification/email do baar nahi jaati).
//
// Returns { status, order } where status is
//   'paid'          — abhi paid mark hua (notification + email gayi)
//   'already_paid'  — pehle se paid tha (idempotent, kuch nahi kiya)
//   'cancelled'     — order cancel ho chuka hai (late payment — caller ko flag karna hai)
//   'not_found'
// ─────────────────────────────────────────────────────────────
export const markOrderPaid = async (orderId, message = 'Payment received successfully') => {
  const push = { statusHistory: { status: 'confirmed', message } };

  // Normal case: placed + unpaid -> confirmed + paid
  let order = await Order.findOneAndUpdate(
    { _id: orderId, orderStatus: 'placed', paymentStatus: { $nin: ['paid', 'refunded'] } },
    { paymentStatus: 'paid', orderStatus: 'confirmed', $push: push },
    { returnDocument: 'after' }
  );

  // Edge: order aage badh chuka (e.g. admin ne processing kar diya) par unpaid — status mat chhedo, sirf paid mark karo
  if (!order) {
    order = await Order.findOneAndUpdate(
      { _id: orderId, orderStatus: { $nin: ['placed', 'cancelled'] }, paymentStatus: { $nin: ['paid', 'refunded'] } },
      { paymentStatus: 'paid', $push: { statusHistory: { status: 'paid', message } } },
      { returnDocument: 'after' }
    );
  }

  if (!order) {
    const existing = await Order.findById(orderId);
    if (!existing) return { status: 'not_found', order: null };
    if (existing.orderStatus === 'cancelled') return { status: 'cancelled', order: existing };
    return { status: 'already_paid', order: existing };
  }

  try {
    await Notification.create({
      userId: order.userId,
      title: 'Payment Successful! ✅',
      message: `Payment for order ${order.orderNumber} confirmed.`,
      type: 'payment',
      link: `/orders/${order._id}`,
    });
  } catch (err) {
    logger.error(`Payment notification failed for ${order._id}: ${err.message}`);
  }
  sendConfirmationEmailFor(order);

  return { status: 'paid', order };
};

// ─────────────────────────────────────────────────────────────
// Late payment: customer ne order cancel hone ke BAAD pay kar diya.
// Order ko wapas zinda nahi karte (stock already release ho chuka) — paisa mila hai
// isliye paymentStatus 'paid' dikhao + history note taaki admin refund kar sake.
// ─────────────────────────────────────────────────────────────
export const flagLatePayment = async (orderId, paymentId) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, orderStatus: 'cancelled', paymentStatus: { $nin: ['paid', 'refunded'] } },
    {
      paymentStatus: 'paid',
      $push: {
        statusHistory: {
          status: 'cancelled',
          message: `Payment received after the order was cancelled — refund required${paymentId ? ` (payment ${paymentId})` : ''}`,
        },
      },
    },
    { returnDocument: 'after' }
  );
  logger.error(`REFUND NEEDED: payment ${paymentId || '(unknown)'} received for cancelled order ${orderId}`);
  return order;
};

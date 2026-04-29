import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

// ─── Notification Types & Templates ──────────────────────────
const NOTIFICATION_TEMPLATES = {
  ORDER_PLACED: (data) => ({
    title: "Order Placed Successfully! 🎉",
    message: `Your order #${data.orderId} for ₹${data.amount?.toLocaleString()} has been placed.`,
    icon: "🛍️",
    actionUrl: `/orders/${data.orderDbId}`,
    actionText: "View Order",
  }),

  ORDER_CONFIRMED: (data) => ({
    title: "Order Confirmed ✅",
    message: `Your order #${data.orderId} has been confirmed and is being processed.`,
    icon: "✅",
    actionUrl: `/orders/${data.orderDbId}`,
    actionText: "Track Order",
  }),

  ORDER_SHIPPED: (data) => ({
    title: "Your Order is Shipped! 🚚",
    message: `Order #${data.orderId} has been shipped via ${data.courierName || "courier"}. Tracking: ${data.trackingNumber}`,
    icon: "🚚",
    actionUrl: `/orders/${data.orderDbId}`,
    actionText: "Track Package",
  }),

  ORDER_DELIVERED: (data) => ({
    title: "Order Delivered! 🎉",
    message: `Your order #${data.orderId} has been delivered. How was your experience?`,
    icon: "🎉",
    actionUrl: `/orders/${data.orderDbId}/review`,
    actionText: "Rate Order",
  }),

  ORDER_CANCELLED: (data) => ({
    title: "Order Cancelled",
    message: `Your order #${data.orderId} has been cancelled. Refund will be processed in 3-5 business days.`,
    icon: "❌",
    actionUrl: `/orders/${data.orderDbId}`,
    actionText: "View Details",
  }),

  PAYMENT_SUCCESS: (data) => ({
    title: "Payment Successful 💳",
    message: `Payment of ₹${data.amount?.toLocaleString()} received for order #${data.orderId}.`,
    icon: "💳",
    actionUrl: `/orders/${data.orderDbId}`,
    actionText: "View Order",
  }),

  PAYMENT_FAILED: (data) => ({
    title: "Payment Failed ⚠️",
    message: `Your payment for order #${data.orderId} failed. Please try again.`,
    icon: "⚠️",
    actionUrl: `/orders/${data.orderDbId}/payment`,
    actionText: "Retry Payment",
  }),

  LOYALTY_POINTS_EARNED: (data) => ({
    title: "Loyalty Points Earned! 🏆",
    message: `You earned ${data.points} points on your purchase. Total: ${data.totalPoints} points.`,
    icon: "🏆",
    actionUrl: `/profile/loyalty`,
    actionText: "View Points",
  }),

  LOYALTY_POINTS_EXPIRING: (data) => ({
    title: "Loyalty Points Expiring Soon! ⏰",
    message: `${data.points} loyalty points will expire in ${data.daysLeft} days. Use them before they're gone!`,
    icon: "⏰",
    actionUrl: `/`,
    actionText: "Shop Now",
  }),

  COUPON_RECEIVED: (data) => ({
    title: "New Coupon Available! 🎁",
    message: `You've received a ${data.discountPercent}% OFF coupon: ${data.code}. Valid till ${data.expiryDate}.`,
    icon: "🎁",
    actionUrl: `/`,
    actionText: "Shop Now",
  }),

  PRICE_DROP: (data) => ({
    title: "Price Drop Alert! 📉",
    message: `${data.productName} is now ₹${data.newPrice?.toLocaleString()} (was ₹${data.oldPrice?.toLocaleString()}).`,
    icon: "📉",
    actionUrl: `/products/${data.productSlug}`,
    actionText: "Buy Now",
  }),

  BACK_IN_STOCK: (data) => ({
    title: "Back in Stock! 🔔",
    message: `${data.productName} is back in stock! Grab it before it runs out again.`,
    icon: "🔔",
    actionUrl: `/products/${data.productSlug}`,
    actionText: "Shop Now",
  }),

  REVIEW_APPROVED: (data) => ({
    title: "Review Published ⭐",
    message: `Your review for "${data.productName}" has been approved and published.`,
    icon: "⭐",
    actionUrl: `/products/${data.productSlug}`,
    actionText: "View Review",
  }),
};

// ─── Create & Send Notification ──────────────────────────────
export const createNotification = async (userId, type, data = {}) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      console.warn(`⚠️ Unknown notification type: ${type}`);
      return null;
    }

    const { title, message, icon, actionUrl, actionText } = template(data);

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: type.toLowerCase(),
      icon,
      actionUrl,
      actionText,
      data, // Raw data bhi store karo
      isRead: false,
    });

    // TODO: Push notification bhejo (Firebase FCM) agar token ho
    await sendPushNotification(userId, { title, message, actionUrl });

    return notification;
  } catch (error) {
    console.error("❌ Create notification error:", error.message);
    return null;
  }
};

// ─── Push Notification (Firebase FCM) ────────────────────────
const sendPushNotification = async (userId, { title, message, actionUrl }) => {
  try {
    // FCM Token user ke paas hona chahiye
    const user = await User.findById(userId).select("fcmTokens").lean();
    if (!user?.fcmTokens?.length) return;

    // Firebase Admin import (agar configure hai)
    // const { getMessaging } = await import('firebase-admin/messaging')
    // const messaging = getMessaging()
    //
    // const multicastMessage = {
    //   tokens: user.fcmTokens,
    //   notification: { title, body: message },
    //   webpush: { fcmOptions: { link: `${process.env.FRONTEND_URL}${actionUrl}` } },
    //   data: { actionUrl }
    // }
    // await messaging.sendEachForMulticast(multicastMessage)

    console.log(
      `📲 Push notification sent to user ${userId} (${user.fcmTokens.length} devices)`
    );
  } catch (error) {
    // Push fail hone pe app crash mat karo
    console.error("Push notification failed:", error.message);
  }
};

// ─── Bulk Notifications ───────────────────────────────────────
export const createBulkNotifications = async (userIds, type, data = {}) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) return;

    const { title, message, icon, actionUrl, actionText } = template(data);

    const notifications = userIds.map((userId) => ({
      user: userId,
      title,
      message,
      type: type.toLowerCase(),
      icon,
      actionUrl,
      actionText,
      data,
      isRead: false,
    }));

    const result = await Notification.insertMany(notifications, {
      ordered: false,
    });
    console.log(
      `✅ Bulk notifications created: ${result.length}/${userIds.length}`
    );
    return result;
  } catch (error) {
    console.error("Bulk notification error:", error.message);
    return [];
  }
};

// ─── Notify All Users (broadcast) ────────────────────────────
export const broadcastNotification = async (type, data = {}, filter = {}) => {
  try {
    const users = await User.find({ isActive: true, ...filter })
      .select("_id")
      .lean();
    const userIds = users.map((u) => u._id);

    if (userIds.length === 0) return;

    // Batch mein process karo (1000 at a time)
    const batchSize = 1000;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await createBulkNotifications(batch, type, data);
    }

    console.log(`📢 Broadcast notification sent to ${userIds.length} users`);
  } catch (error) {
    console.error("Broadcast notification error:", error.message);
  }
};

// ─── Order Notification Helpers ──────────────────────────────
export const notifyOrderPlaced = (userId, order) =>
  createNotification(userId, "ORDER_PLACED", {
    orderId: order._id.toString().slice(-8).toUpperCase(),
    orderDbId: order._id,
    amount: order.totalAmount,
  });

export const notifyOrderShipped = (userId, order, trackingInfo) =>
  createNotification(userId, "ORDER_SHIPPED", {
    orderId: order._id.toString().slice(-8).toUpperCase(),
    orderDbId: order._id,
    trackingNumber: trackingInfo?.trackingNumber,
    courierName: trackingInfo?.courierName,
  });

export const notifyOrderDelivered = (userId, order) =>
  createNotification(userId, "ORDER_DELIVERED", {
    orderId: order._id.toString().slice(-8).toUpperCase(),
    orderDbId: order._id,
  });

export const notifyOrderCancelled = (userId, order) =>
  createNotification(userId, "ORDER_CANCELLED", {
    orderId: order._id.toString().slice(-8).toUpperCase(),
    orderDbId: order._id,
  });

export const notifyPaymentFailed = (userId, order) =>
  createNotification(userId, "PAYMENT_FAILED", {
    orderId: order._id.toString().slice(-8).toUpperCase(),
    orderDbId: order._id,
  });

export const notifyLoyaltyPoints = (userId, points, totalPoints) =>
  createNotification(userId, "LOYALTY_POINTS_EARNED", { points, totalPoints });

export const notifyCouponReceived = (userId, coupon) =>
  createNotification(userId, "COUPON_RECEIVED", {
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    expiryDate: new Date(coupon.expiresAt).toLocaleDateString("en-IN"),
  });

export default {
  create: createNotification,
  createBulk: createBulkNotifications,
  broadcast: broadcastNotification,
  notifyOrderPlaced,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyOrderCancelled,
  notifyPaymentFailed,
  notifyLoyaltyPoints,
  notifyCouponReceived,
};
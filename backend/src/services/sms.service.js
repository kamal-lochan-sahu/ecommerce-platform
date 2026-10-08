import { sendSms } from "./messaging.service.js";

// ─── Base SMS Sender ──────────────────────────────────────────
// Provider (console / twilio / ...) is chosen by SMS_PROVIDER - see messaging.service.js
const sendSMS = async (to, message) => {
  const result = await sendSms({ to, body: message });
  // keep the shape older callers expect
  return result.success
    ? { success: true, sid: result.messageId }
    : { success: false, reason: result.error, error: result.error };
};

// ─── SMS Templates ────────────────────────────────────────────
export const sendOrderConfirmationSMS = async (phone, orderId, amount) => {
  const shortId = orderId.toString().slice(-8).toUpperCase();
  const message =
    `MyShop: Your order #${shortId} for ₹${amount.toLocaleString()} is confirmed! ` +
    `Track: ${process.env.FRONTEND_URL}/orders/${orderId} | Support: ${process.env.SUPPORT_PHONE || "1800-XXX-XXXX"}`;

  return sendSMS(phone, message);
};

export const sendOrderShippedSMS = async (phone, orderId, trackingNumber) => {
  const shortId = orderId.toString().slice(-8).toUpperCase();
  const message =
    `MyShop: Order #${shortId} shipped! Tracking: ${trackingNumber}. ` +
    `Expected delivery in 2-3 days. Track at ${process.env.FRONTEND_URL}/orders/${orderId}`;

  return sendSMS(phone, message);
};

export const sendOrderDeliveredSMS = async (phone, orderId) => {
  const shortId = orderId.toString().slice(-8).toUpperCase();
  const message =
    `MyShop: Order #${shortId} delivered! ` +
    `Rate your experience: ${process.env.FRONTEND_URL}/orders/${orderId}/review. ` +
    `Need help? ${process.env.SUPPORT_PHONE || "support@myshop.com"}`;

  return sendSMS(phone, message);
};

export const sendOtpSMS = async (phone, otp) => {
  const message = `MyShop OTP: ${otp}. Valid for 10 minutes. DO NOT share this with anyone. If not requested, ignore.`;
  return sendSMS(phone, message);
};

export const sendPasswordResetSMS = async (phone, resetLink) => {
  const message = `MyShop: Password reset requested. Click: ${resetLink} (valid 1 hour). Ignore if not you.`;
  return sendSMS(phone, message);
};

export default sendSMS;
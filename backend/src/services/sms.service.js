import twilio from "twilio";

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// ─── Base SMS Sender ──────────────────────────────────────────
const sendSMS = async (to, message) => {
  if (!client) {
    console.warn("⚠️ Twilio not configured. SMS skipped.");
    return { success: false, reason: "Twilio not configured" };
  }

  try {
    // Indian numbers: +91XXXXXXXXXX format
    const formattedTo = to.startsWith("+") ? to : `+91${to}`;

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });

    console.log(`✅ SMS sent to ${formattedTo}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error("❌ SMS send failed:", error.message);
    return { success: false, error: error.message };
  }
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
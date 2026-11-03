import { Settings } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { issueOtp, consumeOtp } from '../services/otp.service.js';
import { signGuestPhoneToken } from '../utils/guestCheckoutToken.js';

const assertGuestCheckoutOpen = async () => {
  const settings = await Settings.getSingleton();
  if (settings.allowGuestCheckout === false) {
    throw new ApiError(403, 'Guest checkout is turned off. Please log in to place an order');
  }
};

// =====================
// @route  POST /api/orders/guest/send-otp
// @access Public (rate-limited)
// Guest Cash on Delivery ke liye apna phone verify karta hai.
// =====================
export const sendGuestCheckoutOtp = asyncHandler(async (req, res) => {
  await assertGuestCheckoutOpen();
  const { phone } = req.body;
  await issueOtp({ purpose: 'guest_checkout', subject: phone, target: phone });
  res.json(new ApiResponse(200, null, 'OTP sent to your phone'));
});

// =====================
// @route  POST /api/orders/guest/verify-otp
// @access Public (rate-limited)
// Sahi OTP par 30 min ka phoneToken milta hai, jo order ke saath bhejna hai.
// =====================
export const verifyGuestCheckoutOtp = asyncHandler(async (req, res) => {
  await assertGuestCheckoutOpen();
  const { phone, otp } = req.body;
  const { target } = await consumeOtp({ purpose: 'guest_checkout', subject: phone, otp });
  if (target !== phone) throw new ApiError(400, 'Invalid OTP');
  res.json(new ApiResponse(200, { phoneToken: signGuestPhoneToken(phone) }, 'Phone verified'));
});

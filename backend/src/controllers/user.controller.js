import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { isPlaceholderEmail } from '../utils/identity.js';
import { issueOtp, consumeOtp } from '../services/otp.service.js';

// =====================
// @route  GET /api/users/profile
// @access Private
// =====================
export const getProfile = asyncHandler(async (req, res) => {
  // password is select:false and stripped by toJSON — fetch it only to learn
  // whether the account HAS one, so the UI can show "Change" vs "Set" password.
  const doc = await User.findById(req.user._id).select('+password');
  const user = doc.toJSON();
  user.hasPassword = Boolean(doc.password);
  user.hasRealEmail = !isPlaceholderEmail(doc.email);
  res.json(new ApiResponse(200, { user }, 'Profile fetched successfully'));
});

// =====================
// @route  PUT /api/users/profile
// @access Private
// =====================
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  // A phone number is a login identifier, so it can only change by proving you own
  // the new one (OTP) - never through a plain form save.
  if (phone && phone !== req.user.phone) {
    throw new ApiError(400, 'To change your phone number, use "Verify phone number" and confirm it with an OTP.');
  }

  const updateData = {};
  if (name) updateData.name = name;

  // Avatar upload
  if (req.file) {
    // Purana avatar delete karo
    if (req.user.avatar) {
      await deleteFromCloudinary(req.user.avatar);
    }
    const avatarUrl = await uploadToCloudinary(
      req.file.buffer,
      'avatars',
      `avatar_${req.user._id}`
    );
    updateData.avatar = avatarUrl;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json(new ApiResponse(200, { user }, 'Profile updated successfully'));
});

// =====================
// @route  PUT /api/users/change-password
// @access Private
// =====================
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Password select karo (default mein nahi aata)
  const user = await User.findById(req.user._id).select('+password');

  const hadPassword = Boolean(user.password);

  if (hadPassword) {
    // Normal case: must prove knowledge of the current password.
    if (!oldPassword) {
      throw new ApiError(400, 'Current password is required');
    }
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw new ApiError(400, 'Current password is incorrect');
    }
    if (oldPassword === newPassword) {
      throw new ApiError(400, 'New password must be different from current password');
    }
  }
  // else: Google/phone-OTP-only account. They are already authenticated and
  // their email may be a placeholder (phone_XXXX@luxora.local) so "Forgot
  // Password" can never reach them — let them set a first password directly.

  user.password = newPassword;
  await user.save();

  res.json(new ApiResponse(
    200,
    null,
    hadPassword ? 'Password changed successfully' : 'Password set successfully'
  ));
});

// =====================
// @route  DELETE /api/users/account
// @access Private
// =====================
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  // Password confirm
  if (user.password) {
    if (!password) throw new ApiError(400, 'Please provide your password to delete account');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError(400, 'Incorrect password');
  }

  // Soft delete: the row stays (orders, invoices and reviews point at it) but the
  // identifiers are RELEASED so the same person can sign up again later, and every
  // session is revoked. (An admin "suspend" keeps the identifiers - that is different.)
  user.isActive = false;
  user.deletedAt = new Date();
  user.email = `deleted_${user._id}@deleted.invalid`;
  user.phone = undefined;
  user.isPhoneVerified = false;
  user.phoneVerifiedAt = undefined;
  user.refreshToken = undefined;
  user.googleId = undefined;
  await user.save({ validateBeforeSave: false });

  const isProdClear = process.env.NODE_ENV === 'production';
  res
    .clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProdClear,
      sameSite: isProdClear ? 'none' : 'lax',
    })
    .json(new ApiResponse(200, null, 'Account deleted successfully'));
});

// =====================
// @route  POST /api/users/email/request
// @access Private
// Phone-only accounts (placeholder email) add a REAL email. We email a code to
// that address first so nobody can attach an inbox they don't own.
// =====================
export const requestEmailAdd = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const user = await User.findById(req.user._id);

  if (!isPlaceholderEmail(user.email)) {
    throw new ApiError(400, 'Your account already has an email address.');
  }
  if (isPlaceholderEmail(email)) {
    throw new ApiError(400, 'Please enter a valid email');
  }

  // Never merge accounts silently - if the email belongs to someone, say so.
  const taken = await User.findOne({ email, _id: { $ne: user._id } });
  if (taken) {
    throw new ApiError(400, 'Email already registered');
  }

  await issueOtp({ purpose: 'email_add', subject: String(user._id), target: email });

  res.json(new ApiResponse(200, { emailSent: true }, `We sent a 6-digit code to ${email}.`));
});

// =====================
// @route  POST /api/users/email/verify
// @access Private
// =====================
export const verifyEmailAdd = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);

  const { target: email } = await consumeOtp({ purpose: 'email_add', subject: String(user._id), otp });

  // Someone may have registered this email while the code was pending.
  const taken = await User.findOne({ email, _id: { $ne: user._id } });
  if (taken) {
    throw new ApiError(400, 'Email already registered');
  }

  user.email = email;
  user.isVerified = true; // they just proved ownership of this inbox

  try {
    await user.save();
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(400, 'Email already registered');
    throw err;
  }

  const out = user.toJSON();
  out.hasRealEmail = true;
  res.json(new ApiResponse(200, { user: out }, 'Email added successfully'));
});

// =====================
// @route  POST /api/users/phone/request
// @access Private
// Add, verify or CHANGE the phone number on this account. The number only becomes
// the account's (verified) phone after the OTP sent to it is confirmed.
// =====================
export const requestPhoneVerification = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const user = await User.findById(req.user._id);

  if (user.isPhoneVerified && user.phone === phone) {
    throw new ApiError(400, 'This phone number is already verified.');
  }

  const owner = await User.findOne({ phone, isPhoneVerified: true, _id: { $ne: user._id } });
  if (owner) {
    throw new ApiError(400, 'This phone number is already linked to another account.');
  }

  await issueOtp({ purpose: 'phone_verify', subject: String(user._id), target: phone });

  res.json(new ApiResponse(200, null, `OTP sent to ${phone}`));
});

// =====================
// @route  POST /api/users/phone/verify
// @access Private
// =====================
export const verifyPhone = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);

  const { target: phone } = await consumeOtp({ purpose: 'phone_verify', subject: String(user._id), otp });

  // Someone else may have verified this number while the OTP was pending.
  const owner = await User.findOne({ phone, isPhoneVerified: true, _id: { $ne: user._id } });
  if (owner) {
    throw new ApiError(400, 'This phone number is already linked to another account.');
  }

  user.phone = phone;
  user.isPhoneVerified = true;
  user.phoneVerifiedAt = new Date();

  try {
    await user.save();
  } catch (err) {
    if (err?.code === 11000) {
      throw new ApiError(400, 'This phone number is already linked to another account.');
    }
    throw err;
  }

  const out = user.toJSON();
  out.hasRealEmail = !isPlaceholderEmail(user.email);
  res.json(new ApiResponse(200, { user: out }, 'Phone number verified'));
});

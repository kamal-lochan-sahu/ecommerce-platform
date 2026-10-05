import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { sendEmail, getOtpEmailTemplate } from '../utils/email.js';
import { isPlaceholderEmail } from '../utils/identity.js';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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

  // Phone already kisi aur ka toh nahi?
  if (phone && phone !== req.user.phone) {
    const existing = await User.findOne({ phone, _id: { $ne: req.user._id } });
    if (existing) {
      throw new ApiError(400, 'Phone number already in use');
    }
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;

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

  // Soft delete — account deactivate karo
  await User.findByIdAndUpdate(req.user._id, { isActive: false });

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

  const code = generateOTP();
  user.pendingEmail = { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  await user.save({ validateBeforeSave: false });

  const emailSent = await sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: getOtpEmailTemplate(code, process.env.CLIENT_NAME),
  });

  res.json(new ApiResponse(
    200,
    { emailSent },
    emailSent
      ? `We sent a 6-digit code to ${email}.`
      : 'We could not send the email right now. Please tap Resend in a minute.'
  ));
});

// =====================
// @route  POST /api/users/email/verify
// @access Private
// =====================
export const verifyEmailAdd = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);
  const pending = user.pendingEmail;

  if (!pending?.email || !pending?.code) {
    throw new ApiError(400, 'No email verification in progress. Please request a new code.');
  }
  if (pending.code !== otp) {
    throw new ApiError(400, 'Invalid OTP');
  }
  if (new Date() > pending.expiresAt) {
    throw new ApiError(400, 'Code has expired. Please request a new one.');
  }

  // Someone may have registered this email while the code was pending.
  const taken = await User.findOne({ email: pending.email, _id: { $ne: user._id } });
  if (taken) {
    throw new ApiError(400, 'Email already registered');
  }

  user.email = pending.email;
  user.pendingEmail = undefined;
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

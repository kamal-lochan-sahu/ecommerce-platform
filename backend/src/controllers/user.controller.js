import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

// =====================
// @route  GET /api/users/profile
// @access Private
// =====================
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
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

  // Google/phone-OTP-only accounts have no password set yet — bcrypt.compare
  // throws on a non-string hash, so guard explicitly instead of crashing.
  if (!user.password) {
    throw new ApiError(400, 'This account has no password set yet. Use "Forgot Password" to set one.');
  }

  // Old password check
  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Same password?
  if (oldPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from current password');
  }

  user.password = newPassword;
  await user.save();

  res.json(new ApiResponse(200, null, 'Password changed successfully'));
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
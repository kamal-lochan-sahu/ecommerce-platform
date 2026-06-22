import crypto from 'crypto';
import { User } from '../models/index.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { sendEmail, getOtpEmailTemplate, getWelcomeEmailTemplate, getPasswordResetTemplate } from '../utils/email.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

// Helper — OTP generate karo (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper — tokens set karo + response do
const sendTokenResponse = (res, user, statusCode = 200, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

  // Refresh token DB mein save karo
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(statusCode, {
        user,
        accessToken,
      }, message)
    );
};

// =====================
// @route  POST /api/auth/register
// @access Public
// =====================
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Email already exists?
  const existingUser = await User.findOne({
    $or: [
      { email },
      ...(phone ? [{ phone }] : []),
    ],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, 'Email already registered');
    }
    throw new ApiError(400, 'Phone number already registered');
  }

  // OTP generate karo for email verification
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // User banao
  const user = await User.create({
    name,
    email,
    phone,
    password,
    otp: { code: otp, expiresAt: otpExpiresAt },
  });

  // Welcome email bhejo
  await sendEmail({
    to: email,
    subject: `Welcome to ${process.env.CLIENT_NAME}!`,
    html: getWelcomeEmailTemplate(name, process.env.CLIENT_NAME),
  });

  // OTP email bhejo
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    html: getOtpEmailTemplate(otp, process.env.CLIENT_NAME),
  });

  sendTokenResponse(res, user, 201, 'Registration successful! Please verify your email.');
});

// =====================
// @route  POST /api/auth/login
// @access Public
// =====================
export const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  // User dhundho with password
  const user = await User.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : []),
    ],
  }).select('+password +refreshToken');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.password) {
    throw new ApiError(400, 'Please login with Google or use OTP');
  }

  // Password match?
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.');
  }
  // Email verification check
  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in. Check your inbox.');
  }

  // Last login update
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(res, user, 200, 'Login successful');
});

// =====================
// @route  POST /api/auth/refresh
// @access Public (with refresh token)
// =====================
export const refreshToken = asyncHandler(async (req, res) => {
  // Cookie ya body se token lo
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) {
    throw new ApiError(401, 'Refresh token not found');
  }

  // Verify
  const decoded = verifyRefreshToken(token);

  // DB mein match karo
  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  sendTokenResponse(res, user, 200, 'Token refreshed');
});

// =====================
// @route  POST /api/auth/logout
// @access Private
// =====================
export const logout = asyncHandler(async (req, res) => {
  // DB se refresh token hatao
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  // Cookie clear karo
  res
    .clearCookie('refreshToken')
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

// =====================
// @route  POST /api/auth/send-otp
// @access Public
// =====================
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  // OTP generate
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // User exists? Update karo, nahi toh naya banao (phone-first registration)
  let user = await User.findOne({ phone });

  if (user) {
    user.otp = { code: otp, expiresAt: otpExpiresAt };
    await user.save({ validateBeforeSave: false });
  } else {
    user = await User.create({
      phone,
      name: `User${phone.slice(-4)}`, // temp name
      otp: { code: otp, expiresAt: otpExpiresAt },
    });
  }

  // Development mein console pe dikhao
  logger.debug(`📱 OTP for ${phone}: [REDACTED in production]`);

  // Production mein Twilio se SMS bhejo
  // await sendSMS(phone, `Your OTP is ${otp}`);

  res.json(new ApiResponse(200, null, `OTP sent to ${phone}`));
});

// =====================
// @route  POST /api/auth/verify-otp
// @access Public
// =====================
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // OTP check
  if (!user.otp?.code || user.otp.code !== otp) {
    throw new ApiError(400, 'Invalid OTP');
  }

  // Expired?
  if (new Date() > user.otp.expiresAt) {
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // OTP clear karo + verify karo
  user.otp = undefined;
  user.isVerified = true;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(res, user, 200, 'OTP verified successfully');
});

// =====================
// @route  POST /api/auth/forgot-password
// @access Public
// =====================
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Security: user exist kare ya na kare, same response do
  if (!user) {
    return res.json(
      new ApiResponse(200, null, 'If this email exists, a reset link has been sent.')
    );
  }

  // Reset token generate karo
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // DB mein save karo (OTP field reuse kar rahe hain)
  user.otp = {
    code: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
  await user.save({ validateBeforeSave: false });

  // Reset URL — frontend ka URL
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${email}`;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: getPasswordResetTemplate(resetUrl, process.env.CLIENT_NAME),
  });

  res.json(new ApiResponse(200, null, 'Password reset link sent to your email.'));
});

// =====================
// @route  POST /api/auth/reset-password
// @access Public
// =====================
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Token hash karo aur match karo
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    'otp.code': hashedToken,
    'otp.expiresAt': { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Password update karo
  user.password = password;
  user.otp = undefined;
  await user.save();

  res.json(new ApiResponse(200, null, 'Password reset successful. Please login.'));
});

// =====================
// @route  GET /api/auth/me
// @access Private
// =====================
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(new ApiResponse(200, { user }, 'User fetched successfully'));
});

// =====================
// @route  POST /api/auth/verify-email
// @access Private
// =====================
export const verifyEmail = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const user = await User.findById(req.user._id);

  if (user.isVerified) {
    return res.json(new ApiResponse(200, null, 'Email already verified'));
  }

  if (!user.otp?.code || user.otp.code !== otp) {
    throw new ApiError(400, 'Invalid OTP');
  }

  if (new Date() > user.otp.expiresAt) {
    throw new ApiError(400, 'OTP expired. Request a new one.');
  }

  user.isVerified = true;
  user.otp = undefined;
  await user.save({ validateBeforeSave: false });

  res.json(new ApiResponse(200, null, 'Email verified successfully'));
});
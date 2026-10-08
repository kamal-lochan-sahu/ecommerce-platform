import crypto from 'crypto';
import { User } from '../models/index.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { sendEmail, getWelcomeEmailTemplate, getPasswordResetTemplate } from '../utils/email.js';
import { issueOtp, consumeOtp } from '../services/otp.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import { placeholderEmailFor } from '../utils/identity.js';

// Helper — OTP generate karo (6 digits)

// Helper — emails are stored lowercase/trimmed by the User schema, so every
// lookup must normalise the same way or "Kamal@Gmail.com" never matches.
const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : email;

// Helper — tokens set karo + response do
// NOTE: async now — every caller MUST await this. Previously user.save()
// ran without await/catch: the response could reach the client before the
// refreshToken was actually persisted (race: an immediate /refresh right
// after login could fail), and any save failure became an unhandled
// promise rejection — which can crash the whole Node process on Render.
const sendTokenResponse = async (res, user, statusCode = 200, message = 'Success') => {
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

  // Refresh token DB mein save karo
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Cookie options
  // Cross-domain (Vercel frontend + Render backend) needs sameSite: 'none'
  // in production — 'strict'/'lax' block the cookie on cross-site requests.
  // sameSite: 'none' MUST be paired with secure: true or browsers reject it.
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
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
  const { name, phone, password } = req.body;
  const email = normalizeEmail(req.body.email);

  // Email already exists?
  const existingUser = await User.findOne({
    $or: [
      { email },
      // an unverified number proves nothing - only a verified owner blocks it
      ...(phone ? [{ phone, isPhoneVerified: true }] : []),
    ],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, 'Email already registered');
    }
    throw new ApiError(400, 'Phone number already registered');
  }

  // User banao
  const user = await User.create({ name, email, phone, password });

  // Welcome email + verification code - fire-and-forget, non-blocking. Registration
  // must not hang or fail just because the mail server is slow/unreachable; if the
  // email does not arrive the user taps "Resend" on the verify screen.
  sendEmail({
    to: email,
    subject: `Welcome to ${process.env.CLIENT_NAME}!`,
    html: getWelcomeEmailTemplate(name, process.env.CLIENT_NAME),
  }).catch((err) => logger.error('Welcome email failed', err));

  issueOtp({ purpose: 'email_verify', subject: String(user._id), target: email, throwOnFailure: false })
    .catch((err) => logger.error('Verification OTP failed', err));

  await sendTokenResponse(res, user, 201, 'Registration successful! Please verify your email.');
});

// =====================
// @route  POST /api/auth/login
// @access Public
// =====================
export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const email = normalizeEmail(req.body.email);

  // User dhundho with password
  const user = await User.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone, isPhoneVerified: true }] : []),
    ],
  }).select('+password +refreshToken');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.password) {
    throw new ApiError(400, 'No password is set for this account yet. Please log in with Phone OTP, then set a password from your profile.');
  }

  // Password match?
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.');
  }
  // NOTE: unverified users are NOT blocked here any more. register() already
  // hands out tokens to unverified users and protect() never checks
  // isVerified, so this 403 only ever produced a permanent lockout (the
  // verify-email route itself needs a token). The frontend sends unverified
  // users to the verify screen after login instead.

  // Last login update
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await sendTokenResponse(res, user, 200, 'Login successful');
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

  await sendTokenResponse(res, user, 200, 'Token refreshed');
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

  // Cookie clear karo — same options jo set karte waqt diye the,
  // warna browser cookie ko match/clear nahi kar payega
  const isProdClear = process.env.NODE_ENV === 'production';
  res
    .clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProdClear,
      sameSite: isProdClear ? 'none' : 'lax',
    })
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

// =====================
// @route  POST /api/auth/send-otp
// @access Public
// =====================
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  // No account is created here any more. Creating users before the number is
  // proven let anyone spam junk accounts and squat other people's numbers.
  // The account (if new) is created in verifyOtp, after the OTP is correct.
  await issueOtp({ purpose: 'login', subject: phone, target: phone });

  res.json(new ApiResponse(200, null, `OTP sent to ${phone}`));
});

// =====================
// @route  POST /api/auth/verify-otp
// @access Public
// =====================
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  await consumeOtp({ purpose: 'login', subject: phone, otp });

  // Only the VERIFIED owner of a number can log in with it.
  const findOwner = () => User.findOne({ phone, isPhoneVerified: true });
  let user = await findOwner();

  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    }
    user.lastLogin = new Date();
  } else {
    // First time this number is proven -> create the account (phone-first signup).
    // The schema needs a unique email, so use a placeholder the user can replace
    // with a real one from their profile.
    try {
      user = await User.create({
        phone,
        isPhoneVerified: true,
        phoneVerifiedAt: new Date(),
        name: `User${phone.slice(-4)}`, // temp name
        email: placeholderEmailFor(phone),
        isVerified: true, // phone-only accounts have no inbox to verify
        lastLogin: new Date(),
      });
    } catch (err) {
      // Two parallel verifications for the same new number: the loser logs in too.
      if (err?.code !== 11000) throw err;
      user = await findOwner();
      if (!user) throw err;
    }
  }

  await sendTokenResponse(res, user, 200, 'OTP verified successfully');
});

// =====================
// @route  POST /api/auth/forgot-password
// @access Public
// =====================
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);

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
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  // Fire-and-forget — this was hanging/failing the whole request when
  // Gmail SMTP was slow, which is exactly the bug Kamal hit. The reset
  // token is already saved above regardless of email delivery.
  sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: getPasswordResetTemplate(resetUrl, process.env.CLIENT_NAME),
  }).catch((err) => logger.error('Password reset email failed', err));

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
// @route  POST /api/auth/resend-verification
// @access Private
// =====================
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isVerified) {
    return res.json(new ApiResponse(200, null, 'Email already verified'));
  }

  await issueOtp({ purpose: 'email_verify', subject: String(user._id), target: user.email });

  res.json(new ApiResponse(200, null, 'A new verification code has been sent to your email.'));
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

  await consumeOtp({ purpose: 'email_verify', subject: String(user._id), otp });

  user.isVerified = true;
  await user.save({ validateBeforeSave: false });

  res.json(new ApiResponse(200, null, 'Email verified successfully'));
});

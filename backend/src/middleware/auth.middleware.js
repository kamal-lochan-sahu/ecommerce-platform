import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// Logged in user check
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new ApiError(401, 'Please login to access this resource');
  }

  const decoded = verifyAccessToken(token);

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated');
  }

  req.user = user;
  next();
});

// Admin only
export const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }
  next();
});

// Vendor or Admin
export const vendorOrAdmin = asyncHandler(async (req, res, next) => {
  if (!['admin', 'vendor'].includes(req.user?.role)) {
    throw new ApiError(403, 'Vendor or Admin access required');
  }
  next();
});

// Optional auth
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // invalid — guest treat karo
    }
  }

  next();
};
import { Notification } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Query: ?page=1&limit=20&type=order|payment|offer|system|loyalty

export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const { type } = req.query;

  const filter = { userId: req.user._id };
  if (type) filter.type = type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      notifications,
      unreadCount,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }, "Notifications fetched")
  );
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) throw new ApiError(404, "Notification not found");

  return res.status(200).json(new ApiResponse(200, notification, "Marked as read"));
});

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  return res.status(200).json(new ApiResponse(200, null, "All notifications marked as read"));
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) throw new ApiError(404, "Notification not found");

  return res.status(200).json(new ApiResponse(200, null, "Notification deleted"));
});

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  return res.status(200).json(new ApiResponse(200, { count }, "Unread count fetched"));
});
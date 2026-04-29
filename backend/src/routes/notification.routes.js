import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// Sab routes protected hain
router.use(protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
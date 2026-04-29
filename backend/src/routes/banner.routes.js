import { Router } from "express";
import {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
} from "../controllers/banner.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { createBannerSchema, updateBannerSchema } from "../validators/banner.validator.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// Public routes
router.get("/", getBanners);
router.get("/:id", getBannerById);

// Admin routes
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  validate(createBannerSchema),
  createBanner
);

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.single("image"),
  validate(updateBannerSchema),
  updateBanner
);

router.delete("/:id", protect, adminOnly, deleteBanner);

export default router;
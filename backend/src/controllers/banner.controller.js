import { Banner } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// ─── POST /api/banners ────────────────────────────────────────────────────────

export const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, link, type, position, isActive, sortOrder, startsAt, endsAt } = req.body;

  if (!req.file) throw new ApiError(400, "Banner image required");

  const imageUrl = await uploadToCloudinary(
    req.file.buffer,
    "banners",
    `banner_${Date.now()}`
  );

  // Mobile image (optional)
  let mobileImageUrl;
  if (req.files?.mobileImage?.[0]) {
    mobileImageUrl = await uploadToCloudinary(
      req.files.mobileImage[0].buffer,
      "banners/mobile",
      `banner_mobile_${Date.now()}`
    );
  }

  const banner = await Banner.create({
    title,
    subtitle,
    image: imageUrl,
    mobileImage: mobileImageUrl,
    link,
    type: type || "hero",
    position: position || "home_top",
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder || 0,
    startsAt,
    endsAt,
  });

  return res.status(201).json(new ApiResponse(201, banner, "Banner created"));
});

// ─── GET /api/banners ─────────────────────────────────────────────────────────
// Query: ?type=hero&position=home_top&active=true

export const getBanners = asyncHandler(async (req, res) => {
  const { type, position, active } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (position) filter.position = position;
  if (active === "true") {
    filter.isActive = true;
    const now = new Date();
    filter.$and = [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ];
  }

  const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, banners, "Banners fetched"));
});

// ─── GET /api/banners/:id ─────────────────────────────────────────────────────

export const getBannerById = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, "Banner not found");

  return res.status(200).json(new ApiResponse(200, banner, "Banner fetched"));
});

// ─── PUT /api/banners/:id ─────────────────────────────────────────────────────

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, "Banner not found");

  const { title, subtitle, link, type, position, isActive, sortOrder, startsAt, endsAt } = req.body;

  // New image uploaded?
  if (req.file) {
    // Delete old image from Cloudinary
    if (banner.image) await deleteFromCloudinary(banner.image);
    banner.image = await uploadToCloudinary(
      req.file.buffer,
      "banners",
      `banner_${Date.now()}`
    );
  }

  // Update fields
  if (title !== undefined) banner.title = title;
  if (subtitle !== undefined) banner.subtitle = subtitle;
  if (link !== undefined) banner.link = link;
  if (type !== undefined) banner.type = type;
  if (position !== undefined) banner.position = position;
  if (isActive !== undefined) banner.isActive = isActive;
  if (sortOrder !== undefined) banner.sortOrder = sortOrder;
  if (startsAt !== undefined) banner.startsAt = startsAt;
  if (endsAt !== undefined) banner.endsAt = endsAt;

  await banner.save();

  return res.status(200).json(new ApiResponse(200, banner, "Banner updated"));
});

// ─── DELETE /api/banners/:id ──────────────────────────────────────────────────

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, "Banner not found");

  // Cloudinary se delete
  if (banner.image) await deleteFromCloudinary(banner.image);
  if (banner.mobileImage) await deleteFromCloudinary(banner.mobileImage);

  await banner.deleteOne();

  return res.status(200).json(new ApiResponse(200, null, "Banner deleted"));
});
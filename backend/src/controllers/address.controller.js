import { Address } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// =====================
// @route  GET /api/addresses
// @access Private
// =====================
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id })
    .sort({ isDefault: -1, createdAt: -1 }); // default pehle

  res.json(new ApiResponse(200, { addresses }, 'Addresses fetched successfully'));
});

// =====================
// @route  POST /api/addresses
// @access Private
// =====================
export const addAddress = asyncHandler(async (req, res) => {
  const { fullName, phone, addressLine1, addressLine2, city, state, pincode, country, type, isDefault } = req.body;

  // Pehला address? Auto default
  const existingCount = await Address.countDocuments({ userId: req.user._id });
  const shouldBeDefault = existingCount === 0 ? true : isDefault;

  // Agar naya default hai toh purana default hatao
  if (shouldBeDefault) {
    await Address.updateMany(
      { userId: req.user._id },
      { isDefault: false }
    );
  }

  const address = await Address.create({
    userId: req.user._id,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    country: country || 'India',
    type: type || 'home',
    isDefault: shouldBeDefault,
  });

  res.status(201).json(new ApiResponse(201, { address }, 'Address added successfully'));
});

// =====================
// @route  PUT /api/addresses/:id
// @access Private
// =====================
export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    userId: req.user._id, // apna hi address update kar sakta hai
  });

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  const { isDefault, ...updateData } = req.body;

  // Default change?
  if (isDefault && !address.isDefault) {
    await Address.updateMany(
      { userId: req.user._id },
      { isDefault: false }
    );
    updateData.isDefault = true;
  }

  const updated = await Address.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json(new ApiResponse(200, { address: updated }, 'Address updated successfully'));
});

// =====================
// @route  DELETE /api/addresses/:id
// @access Private
// =====================
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  await address.deleteOne();

  // Agar deleted address default tha toh latest ko default banao
  if (address.isDefault) {
    const latest = await Address.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 });
    if (latest) {
      latest.isDefault = true;
      await latest.save();
    }
  }

  res.json(new ApiResponse(200, null, 'Address deleted successfully'));
});

// =====================
// @route  PUT /api/addresses/:id/default
// @access Private
// =====================
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  // Sab ka default false karo
  await Address.updateMany(
    { userId: req.user._id },
    { isDefault: false }
  );

  // Is address ka default true karo
  address.isDefault = true;
  await address.save();

  res.json(new ApiResponse(200, { address }, 'Default address updated'));
});
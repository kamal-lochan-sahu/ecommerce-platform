import { Category } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateUniqueCategorySlug } from '../utils/slug.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// =====================
// @route  POST /api/categories
// @access Admin
// =====================
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parent, isActive, sortOrder } = req.body;

  // Slug generate
  const slug = await generateUniqueCategorySlug(name);

  // Image upload
  let image = '';
  if (req.file) {
    image = await uploadToCloudinary(
      req.file.buffer,
      'categories',
      `cat_${slug}`
    );
  }

  const category = await Category.create({
    name,
    slug,
    description,
    image,
    parent: parent || null,
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json(
    new ApiResponse(201, { category }, 'Category created successfully')
  );
});

// =====================
// @route  GET /api/categories
// @access Public
// =====================
export const getCategories = asyncHandler(async (req, res) => {
  const { tree, parent } = req.query;

  // Tree structure chahiye?
  if (tree === 'true') {
    const allCategories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 });

    // Parent categories
    const parents = allCategories.filter(c => !c.parent);

    // Children attach karo
    const categoryTree = parents.map(p => ({
      ...p.toObject(),
      subcategories: allCategories.filter(
        c => c.parent?.toString() === p._id.toString()
      ),
    }));

    return res.json(
      new ApiResponse(200, { categories: categoryTree }, 'Categories fetched')
    );
  }

  // Flat list — parent filter ke saath
  const filter = { isActive: true };
  if (parent === 'null' || parent === '') {
    filter.parent = null; // sirf top-level
  } else if (parent) {
    filter.parent = parent;
  }

  const categories = await Category.find(filter)
    .populate('parent', 'name slug')
    .sort({ sortOrder: 1, name: 1 });

  res.json(new ApiResponse(200, { categories }, 'Categories fetched'));
});

// =====================
// @route  GET /api/categories/:slug
// @access Public
// =====================
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    isActive: true,
  }).populate('parent', 'name slug');

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Subcategories bhi lo
  const subcategories = await Category.find({
    parent: category._id,
    isActive: true,
  }).sort({ sortOrder: 1 });

  res.json(
    new ApiResponse(200, { category, subcategories }, 'Category fetched')
  );
});

// =====================
// @route  PUT /api/categories/:id
// @access Admin
// =====================
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const { name, description, parent, isActive, sortOrder } = req.body;

  if (name && name !== category.name) {
    category.slug = await generateUniqueCategorySlug(name, category._id);
    category.name = name;
  }

  if (description !== undefined) category.description = description;
  if (parent !== undefined) category.parent = parent || null;
  if (isActive !== undefined) category.isActive = isActive;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;

  if (req.file) {
    category.image = await uploadToCloudinary(
      req.file.buffer,
      'categories',
      `cat_${category.slug}`
    );
  }

  await category.save();

  res.json(new ApiResponse(200, { category }, 'Category updated'));
});

// =====================
// @route  DELETE /api/categories/:id
// @access Admin
// =====================
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  // Children hain?
  const childCount = await Category.countDocuments({ parent: req.params.id });
  if (childCount > 0) {
    throw new ApiError(400, `Cannot delete — ${childCount} subcategories exist`);
  }

  await category.deleteOne();
  res.json(new ApiResponse(200, null, 'Category deleted'));
});
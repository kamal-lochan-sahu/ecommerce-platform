import { Product, ProductVariant, Category } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateUniqueProductSlug } from '../utils/slug.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { getPagination, getPaginationMeta } from '../utils/pagination.js';

// =====================
// @route  POST /api/products
// @access Admin
// =====================
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name, description, shortDescription, category,
    brand, price, comparePrice, costPrice,
    stock, lowStockThreshold, sku, hasVariants,
    tags, specifications, isActive, isFeatured,
    weight, dimensions, meta,
  } = req.body;

  // Category exist karti hai?
  const categoryExists = await Category.findById(category);
  if (!categoryExists) throw new ApiError(404, 'Category not found');

  // SKU unique?
  if (sku) {
    const skuExists = await Product.findOne({ sku });
    if (skuExists) throw new ApiError(400, 'SKU already exists');
  }

  // Slug generate
  const slug = await generateUniqueProductSlug(name);

  // Images upload
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map((file, index) =>
      uploadToCloudinary(file.buffer, 'products', `${slug}_${index}`)
    );
    images = await Promise.all(uploadPromises);
  }

  const product = await Product.create({
    name, slug, description, shortDescription,
    category, brand, price,
    comparePrice: comparePrice || 0,
    costPrice: costPrice || 0,
    stock: stock || 0,
    lowStockThreshold: lowStockThreshold || 10,
    sku, hasVariants: hasVariants || false,
    tags: tags || [],
    specifications: specifications || [],
    images,
    isActive: isActive !== undefined ? isActive : true,
    isFeatured: isFeatured || false,
    weight, dimensions, meta,
  });

  res.status(201).json(
    new ApiResponse(201, { product }, 'Product created successfully')
  );
});

// =====================
// @route  GET /api/products
// @access Public
// =====================
export const getProducts = asyncHandler(async (req, res) => {
  const {
    category, brand, minPrice, maxPrice,
    rating, inStock, isFeatured, search,
    sortBy, order,
  } = req.query;

  const { page, limit, skip } = getPagination(req.query);

  // Filter object build karo
  const filter = { isActive: true };

  // `category` query param is a SLUG (e.g. "electronics-gadgets"), but
  // Product.category is an ObjectId ref — resolve slug -> _id first,
  // otherwise Mongoose throws a CastError which the error middleware
  // turns into a misleading 404.
  if (category) {
    const categoryDoc = await Category.findOne({ slug: category }).select('_id');
    // No matching category (bad/stale slug) -> empty result, not a crash.
    filter.category = categoryDoc ? categoryDoc._id : null;
  }
  if (brand) filter.brand = { $regex: brand, $options: 'i' };
  if (isFeatured === 'true') filter.isFeatured = true;
  if (inStock === 'true') filter.stock = { $gt: 0 };

  // Price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Rating filter
  if (rating) {
    filter['ratings.average'] = { $gte: Number(rating) };
  }

  // Search
  if (search) {
    filter.$text = { $search: search };
  }

  // Sort
  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { 'ratings.average': -1 },
    popular: { totalSold: -1 },
  };
  const sort = sortOptions[sortBy] || { createdAt: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .select('-costPrice')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      products,
      pagination: getPaginationMeta(total, page, limit),
    }, 'Products fetched')
  );
});

// =====================
// @route  GET /api/products/:slug
// @access Public
// =====================
export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isActive: true,
  })
    .populate('category', 'name slug')
    .select('-costPrice');

  if (!product) throw new ApiError(404, 'Product not found');

  // Variants bhi lo agar hain
  const variants = await ProductVariant.find({
    productId: product._id,
    isActive: true,
  });

  res.json(
    new ApiResponse(200, { product, variants }, 'Product fetched')
  );
});

// =====================
// @route  GET /api/products/id/:id
// @access Admin
// =====================
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug');

  if (!product) throw new ApiError(404, 'Product not found');

  const variants = await ProductVariant.find({ productId: product._id });

  res.json(new ApiResponse(200, { product, variants }, 'Product fetched'));
});

// =====================
// @route  PUT /api/products/:id
// @access Admin
// =====================
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const { name, ...updateData } = req.body;

  // Name change? New slug generate karo
  if (name && name !== product.name) {
    updateData.name = name;
    updateData.slug = await generateUniqueProductSlug(name, product._id);
  }

  // New images upload
  if (req.files && req.files.length > 0) {
    const slug = updateData.slug || product.slug;
    const uploadPromises = req.files.map((file, index) =>
      uploadToCloudinary(
        file.buffer,
        'products',
        `${slug}_${Date.now()}_${index}`
      )
    );
    const newImages = await Promise.all(uploadPromises);
    updateData.images = [...(product.images || []), ...newImages];
  }

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('category', 'name slug');

  res.json(new ApiResponse(200, { product: updated }, 'Product updated'));
});

// =====================
// @route  DELETE /api/products/:id
// @access Admin
// =====================
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  // Soft delete
  await Product.findByIdAndUpdate(req.params.id, { isActive: false });

  res.json(new ApiResponse(200, null, 'Product deleted'));
});

// =====================
// @route  GET /api/products/featured
// @access Public
// =====================
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug')
    .select('-costPrice')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.json(new ApiResponse(200, { products }, 'Featured products fetched'));
});

// =====================
// @route  GET /api/products/search
// @access Public
// =====================
export const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }

  const { page, limit, skip } = getPagination(req.query);

  const filter = {
    isActive: true,
    $text: { $search: q },
  };

  const [products, total] = await Promise.all([
    Product.find(filter, { score: { $meta: 'textScore' } })
      .populate('category', 'name slug')
      .select('-costPrice')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(200, {
      products,
      pagination: getPaginationMeta(total, page, limit),
      query: q,
    }, 'Search results')
  );
});
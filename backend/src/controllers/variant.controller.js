import mongoose from 'mongoose';
import { Product, ProductVariant, Order, Cart } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { syncProductFromVariants } from '../services/variantSync.service.js';

const MAX_VARIANTS_PER_PRODUCT = 50;

const loadProduct = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) throw new ApiError(404, 'Product not found');
  const product = await Product.findById(productId);
  if (!product || product.deletedAt) throw new ApiError(404, 'Product not found');
  return product;
};

const loadVariant = async (productId, variantId) => {
  if (!mongoose.isValidObjectId(variantId)) throw new ApiError(404, 'Variant not found');
  const variant = await ProductVariant.findOne({ _id: variantId, productId });
  if (!variant) throw new ApiError(404, 'Variant not found');
  return variant;
};

const cleanOptions = (options) =>
  options.map((o) => ({ name: String(o.name).trim(), value: String(o.value).trim() }));

const optionNameKey = (options) =>
  options.map((o) => o.name.toLowerCase()).sort().join('|');

const optionComboKey = (options) =>
  options
    .map((o) => `${o.name.toLowerCase()}=${o.value.toLowerCase()}`)
    .sort()
    .join('|');

// "Red / XL" — admin naam na de to options ki values se banta hai
const autoName = (options) => options.map((o) => o.value).join(' / ');

// Ek product ke saare ACTIVE variants ek hi tarah ke options use karein (Color+Size, "Colour"+"Size" nahi),
// aur same combination (Red / XL) do baar na bane (inactive variants ke saath bhi).
// Option NAMES sirf active variants se match hote hain: order wala band variant delete nahi ho sakta,
// wo naye variants ko hamesha ke liye purane option names mein lock na kar de.
const checkOptionsAgainstSiblings = (options, siblings) => {
  const combo = optionComboKey(options);
  if (siblings.some((s) => optionComboKey(s.options || []) === combo)) {
    throw new ApiError(400, `A variant with ${autoName(options)} already exists for this product`);
  }
  const active = siblings.filter((s) => s.isActive !== false);
  if (active.length > 0) {
    const expected = optionNameKey(active[0].options || []);
    if (optionNameKey(options) !== expected) {
      const names = (active[0].options || []).map((o) => o.name).join(', ');
      throw new ApiError(400, `All variants of a product must use the same options: ${names}`);
    }
  }
};

const normalizeSku = (sku) => {
  const s = String(sku ?? '').trim().toUpperCase();
  return s || undefined;
};

const checkSkuFree = async (sku, ignoreVariantId) => {
  if (!sku) return;
  const filter = ignoreVariantId ? { sku, _id: { $ne: ignoreVariantId } } : { sku };
  const inVariants = await ProductVariant.findOne(filter);
  const inProducts = await Product.findOne({ sku });
  if (inVariants || inProducts) throw new ApiError(400, 'SKU already exists');
};

const checkPrices = (price, comparePrice) => {
  if (comparePrice && comparePrice < price) {
    throw new ApiError(400, 'Compare price (MRP) cannot be lower than the selling price');
  }
};

const checkImages = (images, product) => {
  const allowed = new Set(product.images || []);
  if ((images || []).some((img) => !allowed.has(img))) {
    throw new ApiError(400, "Variant images must be chosen from the product's own images");
  }
};

const productSummary = (product) => ({
  _id: product._id,
  price: product.price,
  comparePrice: product.comparePrice,
  stock: product.stock,
  hasVariants: product.hasVariants,
});

// @route  GET /api/products/:productId/variants   (Admin) — inactive bhi dikhte hain
export const listVariants = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.productId);
  const variants = await ProductVariant.find({ productId: product._id }).sort({ createdAt: 1 });
  res.json(new ApiResponse(200, { variants }, 'Variants fetched'));
});

// @route  POST /api/products/:productId/variants   (Admin)
export const createVariant = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.productId);
  const { price, comparePrice, stock, images, isActive } = req.body;
  const options = cleanOptions(req.body.options);
  const sku = normalizeSku(req.body.sku);

  const siblings = await ProductVariant.find({ productId: product._id });
  if (siblings.length >= MAX_VARIANTS_PER_PRODUCT) {
    throw new ApiError(400, `A product can have at most ${MAX_VARIANTS_PER_PRODUCT} variants`);
  }
  checkOptionsAgainstSiblings(options, siblings);
  checkPrices(price, comparePrice);
  checkImages(images, product);
  await checkSkuFree(sku);

  const variant = await ProductVariant.create({
    productId: product._id,
    name: String(req.body.name || '').trim() || autoName(options),
    options,
    price,
    comparePrice: comparePrice || 0,
    stock: stock ?? 0,
    sku,
    images: images || [],
    isActive: isActive ?? true,
  });

  await syncProductFromVariants(product._id);
  const fresh = await Product.findById(product._id);

  res.status(201).json(new ApiResponse(201, { variant, product: productSummary(fresh) }, 'Variant created'));
});

// @route  PUT /api/products/:productId/variants/:variantId   (Admin)
export const updateVariant = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.productId);
  const variant = await loadVariant(product._id, req.params.variantId);
  const body = req.body;

  const options = body.options ? cleanOptions(body.options) : variant.options.map((o) => ({ name: o.name, value: o.value }));
  const price = body.price ?? variant.price;
  const comparePrice = body.comparePrice !== undefined ? body.comparePrice : variant.comparePrice;

  // Band variant wapas chalu karna bhi naya active variant jodne jaisa hai: options baaki active variants se mel khaane chahiye
  const reactivating = body.isActive === true && variant.isActive === false;
  if (body.options || reactivating) {
    const siblings = (await ProductVariant.find({ productId: product._id }))
      .filter((s) => String(s._id) !== String(variant._id));
    checkOptionsAgainstSiblings(options, siblings);
  }
  checkPrices(price, comparePrice);
  if (body.images) checkImages(body.images, product);

  if (body.sku !== undefined) {
    const sku = normalizeSku(body.sku);
    await checkSkuFree(sku, variant._id);
    variant.sku = sku;
  }

  if (body.options) {
    variant.options = options;
    // Naam admin ne alag se nahi diya to options badalne par naam bhi naya
    variant.name = String(body.name || '').trim() || autoName(options);
  } else if (body.name !== undefined) {
    variant.name = String(body.name).trim() || autoName(options);
  }
  if (body.price !== undefined) variant.price = body.price;
  if (body.comparePrice !== undefined) variant.comparePrice = body.comparePrice || 0;
  if (body.stock !== undefined) variant.stock = body.stock;
  if (body.images !== undefined) variant.images = body.images;
  if (body.isActive !== undefined) variant.isActive = body.isActive;

  await variant.save();
  await syncProductFromVariants(product._id);
  const fresh = await Product.findById(product._id);

  res.json(new ApiResponse(200, { variant, product: productSummary(fresh) }, 'Variant updated'));
});

// @route  DELETE /api/products/:productId/variants/:variantId   (Admin)
// Jis variant ka order ho chuka hai use mitate nahi (order history / invoice us par tikti hai),
// sirf inactive kar dete hain. Baaki variants hard delete hote hain.
export const deleteVariant = asyncHandler(async (req, res) => {
  const product = await loadProduct(req.params.productId);
  const variant = await loadVariant(product._id, req.params.variantId);

  const hasOrders = await Order.exists({ 'items.variant': variant._id });
  let deactivated = false;

  if (hasOrders) {
    variant.isActive = false;
    await variant.save();
    deactivated = true;
  } else {
    await ProductVariant.deleteOne({ _id: variant._id });
  }

  // Ab ye variant khareedne layak nahi — carts se hata do taaki customer ko toota item na dikhe
  await Cart.updateMany({ 'items.variant': variant._id }, { $pull: { items: { variant: variant._id } } });

  await syncProductFromVariants(product._id);
  const fresh = await Product.findById(product._id);

  res.json(new ApiResponse(
    200,
    { deactivated, product: productSummary(fresh) },
    deactivated ? 'Variant has past orders, so it was deactivated instead of deleted' : 'Variant deleted'
  ));
});

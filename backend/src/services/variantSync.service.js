import { Product, ProductVariant } from '../models/index.js';

// ─────────────────────────────────────────────────────────────
// Variant products ka Product document "derived" hota hai:
//   Product.stock       = saare ACTIVE variants ke stock ka jod
//   Product.price       = sabse sasta active variant ("from Rs X" listing, sort aur filter ke liye)
//   Product.comparePrice = us saste variant ka comparePrice (agar price se bada ho, warna 0)
//   Product.hasVariants = kam se kam ek active variant hai
// Isse product listing, admin stock filters aur low-stock alerts bina badle chalte rahte hain.
// Order ke waqt stock incremental ($inc) badalta hai (order.controller / orderLifecycle);
// admin ke variant create/edit/delete ke baad yahan se poora recompute hota hai.
// ─────────────────────────────────────────────────────────────
export const computeVariantSummary = (variants) => {
  const active = variants.filter((v) => v.isActive !== false);
  if (active.length === 0) {
    return { hasVariants: false, stock: 0 };
  }
  const cheapest = active.reduce((a, b) => (b.price < a.price ? b : a));
  return {
    hasVariants: true,
    stock: active.reduce((sum, v) => sum + (v.stock || 0), 0),
    price: cheapest.price,
    comparePrice: cheapest.comparePrice > cheapest.price ? cheapest.comparePrice : 0,
  };
};

export const syncProductFromVariants = async (productId, session = null) => {
  const variants = await ProductVariant.find({ productId }).session(session).lean();
  const summary = computeVariantSummary(variants);
  await Product.findByIdAndUpdate(productId, summary, { session });
  return summary;
};

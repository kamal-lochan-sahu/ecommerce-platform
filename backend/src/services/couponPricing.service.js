import { Coupon } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { countCouponUses } from '../utils/couponUsage.js';

// ─────────────────────────────────────────────────────────────
// Coupon ka poora hisaab EK jagah (pehle coupon.controller aur order.controller mein
// alag-alag copy thi, isliye cart mein dikhne wala discount aur order mein lagne wala
// discount alag ho sakte the).
//
// Scope: coupon par applicableProducts / applicableCategories ho to discount SIRF unhi
// items par lagta hai (category ke subcategories bhi count hote hain). Dono khaali = poore cart par.
// minOrderAmount bhi eligible items ke subtotal par check hota hai.
// ─────────────────────────────────────────────────────────────

const idOf = (v) => String(v?._id ?? v);

const lineTotal = (item) => (Number(item.price) || 0) * (Number(item.quantity) || 0);

export const couponHasScope = (coupon) =>
  (coupon.applicableProducts?.length || 0) > 0 || (coupon.applicableCategories?.length || 0) > 0;

// Category ids + unke saare subcategories (parent -> child, max 5 level)
const expandCategoryIds = async (ids) => {
  const all = new Set(ids.map(idOf));
  if (all.size === 0) return all;

  // Lazy import: category model sirf tab chahiye jab coupon category-scoped ho
  const { default: Category } = await import('../models/category.model.js');

  let frontier = [...all];
  for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
    const children = await Category.find({ parent: { $in: frontier } }).select('_id').lean();
    frontier = [];
    for (const child of children) {
      const id = idOf(child._id);
      if (!all.has(id)) {
        all.add(id);
        frontier.push(id);
      }
    }
  }
  return all;
};

// Coupon dhundho: active + date range + total usage limit
export const findUsableCoupon = async (code) => {
  const now = new Date();
  const coupon = await Coupon.findOne({
    code: String(code || '').toUpperCase(),
    isActive: true,
    expiresAt: { $gt: now },
    startsAt: { $lte: now },
  });

  if (!coupon) throw new ApiError(400, 'Invalid or expired coupon');

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'Coupon usage limit exceeded');
  }

  return coupon;
};

// who = { userId, guestKey, relatedUserIds } ya null (guest ka phone abhi pata nahi — uska
// limit order lagate waqt phone se check hota hai)
export const assertWithinPerUserLimit = (coupon, who) => {
  if (!who) return;
  if (countCouponUses(coupon, who) >= coupon.usagePerUser) {
    throw new ApiError(400, 'You have already used this coupon');
  }
};

// items = cart items (price, quantity, product = populated doc ya id; product.category zaroori
// sirf category-scoped coupon ke liye). Prices LIVE honi chahiye (refreshCartItemPrices ke baad).
export const priceCoupon = async ({ code, items, who = null }) => {
  const coupon = await findUsableCoupon(code);

  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const scoped = couponHasScope(coupon);
  let eligibleItems = items;

  if (scoped) {
    const productIds = new Set((coupon.applicableProducts || []).map(idOf));
    const categoryIds = await expandCategoryIds(coupon.applicableCategories || []);

    eligibleItems = items.filter((item) => {
      const product = item.product;
      if (!product) return false;
      if (productIds.has(idOf(product))) return true;
      const category = product.category;
      return category ? categoryIds.has(idOf(category)) : false;
    });

    if (eligibleItems.length === 0) {
      throw new ApiError(400, 'This coupon is not valid for the items in your cart');
    }
  }

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + lineTotal(item), 0);

  if (eligibleSubtotal < coupon.minOrderAmount) {
    throw new ApiError(
      400,
      scoped
        ? `Minimum ₹${coupon.minOrderAmount} of eligible items required for this coupon`
        : `Minimum order amount ₹${coupon.minOrderAmount} required`
    );
  }

  assertWithinPerUserLimit(coupon, who);

  let discount;
  if (coupon.type === 'percentage') {
    discount = (eligibleSubtotal * coupon.value) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }
  // Discount kabhi eligible items ke total se zyada nahi (warna order total negative ho sakta tha)
  discount = Math.round(Math.min(discount, eligibleSubtotal));

  return { coupon, discount, subtotal, eligibleSubtotal, scoped };
};

// Cart mein saved coupon ko current items ke hisaab se dobara tolo (qty/items badle, coupon
// expire hua, limit poori hui...). Discount badla to cart.couponDiscount update; coupon ab
// valid nahi to hata do. Caller cart.save() kare jab changed true ho.
export const revalidateCartCoupon = async (cart, who = null) => {
  if (!cart.couponCode) return { changed: false, removedReason: null, scoped: null };

  try {
    const { discount, scoped } = await priceCoupon({ code: cart.couponCode, items: cart.items, who });
    if (discount === cart.couponDiscount) return { changed: false, removedReason: null, scoped };
    cart.couponDiscount = discount;
    return { changed: true, removedReason: null, scoped };
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    cart.couponCode = null;
    cart.couponDiscount = 0;
    return { changed: true, removedReason: err.message, scoped: null };
  }
};

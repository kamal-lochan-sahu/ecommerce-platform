import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Round 5 Group 7A: coupon product/category scoping + ONE shared pricing function.
//  - discount sirf eligible items par (product ya category, subcategory bhi)
//  - min order eligible subtotal par, fixed discount eligible subtotal se zyada nahi
//  - applyCoupon, validateCoupon, createOrder ab ek hi service use karte hain
//  - getCart saved coupon ko dobara tolta hai (stale discount nahi)
// Fake DB — real controllers/service.

const db = { coupon: null, cart: null, categories: [] };

const thenable = (value) => {
  const t = { populate: () => t, select: () => t, lean: () => t, then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return t;
};

const Coupon = { findOne: (q) => thenable(db.coupon && db.coupon.code === q.code ? db.coupon : null) };
const Cart = { findOne: () => thenable(db.cart) };

mock.module('../src/models/index.js', {
  namedExports: { Coupon, Cart, Product: {}, ProductVariant: {}, User: {} },
});
// parent -> child lookup for subcategory expansion
mock.module('../src/models/category.model.js', {
  defaultExport: {
    find: (q) => thenable(db.categories.filter((c) => q.parent.$in.map(String).includes(String(c.parent)))),
  },
});

const { priceCoupon, revalidateCartCoupon, couponHasScope } = await import('../src/services/couponPricing.service.js');
const { applyCoupon, validateCoupon } = await import('../src/controllers/coupon.controller.js');
const { getCart } = await import('../src/controllers/cart.controller.js');
const { createCouponSchema, updateCouponSchema } = await import('../src/validators/coupon.validator.js');

const run = async (handler, { user = null, body = {}, headers = {} } = {}) => {
  const out = { code: 200, body: null, err: null };
  const res = { status(c) { out.code = c; return res; }, json(b) { out.body = b; return res; } };
  await handler({ user, body, headers }, res, (e) => { out.err = e; });
  return out;
};

const OID = (n) => String(n).padStart(24, 'a');
const P_SHIRT = OID(1);
const P_MUG = OID(2);
const C_APPAREL = OID(10);
const C_SHIRTS = OID(11); // child of apparel
const C_HOME = OID(12);

const item = (productId, categoryId, price, quantity = 1) => ({
  product: { _id: productId, category: categoryId },
  variant: null,
  price,
  quantity,
});
const mkCoupon = (over = {}) => ({
  _id: 'c1', code: 'SAVE10', type: 'percentage', value: 10, maxDiscount: 0, minOrderAmount: 0,
  usageLimit: 0, usedCount: 0, usagePerUser: 1, usedBy: [],
  applicableProducts: [], applicableCategories: [], ...over,
});
const mkCart = (items, over = {}) => ({
  userId: 'u1', items, couponCode: null, couponDiscount: 0,
  save: async function save() { this.saved = true; },
  get totalAmount() { return this.items.reduce((s, i) => s + i.price * i.quantity, 0); },
  get totalItems() { return this.items.reduce((s, i) => s + i.quantity, 0); },
  ...over,
});

beforeEach(() => {
  db.coupon = mkCoupon();
  db.cart = null;
  db.categories = [{ _id: C_SHIRTS, parent: C_APPAREL }];
});

// ── service ──────────────────────────────────────────────────

test('unscoped coupon: percentage on the whole cart (old behaviour unchanged)', async () => {
  const items = [item(P_SHIRT, C_SHIRTS, 1000, 2), item(P_MUG, C_HOME, 500)];
  const r = await priceCoupon({ code: 'save10', items });
  assert.equal(r.scoped, false);
  assert.equal(r.subtotal, 2500);
  assert.equal(r.eligibleSubtotal, 2500);
  assert.equal(r.discount, 250);
});

test('product-scoped coupon discounts only the listed product', async () => {
  db.coupon = mkCoupon({ applicableProducts: [P_MUG] });
  const items = [item(P_SHIRT, C_SHIRTS, 1000, 2), item(P_MUG, C_HOME, 500)];
  const r = await priceCoupon({ code: 'SAVE10', items });
  assert.equal(r.scoped, true);
  assert.equal(r.subtotal, 2500);
  assert.equal(r.eligibleSubtotal, 500);
  assert.equal(r.discount, 50);
});

test('category-scoped coupon includes products of subcategories', async () => {
  db.coupon = mkCoupon({ applicableCategories: [C_APPAREL] });
  const items = [item(P_SHIRT, C_SHIRTS, 1000, 2), item(P_MUG, C_HOME, 500)];
  const r = await priceCoupon({ code: 'SAVE10', items });
  assert.equal(r.eligibleSubtotal, 2000); // shirt is in a CHILD of apparel
  assert.equal(r.discount, 200);
});

test('scoped coupon with no eligible item in the cart is refused with a clear message', async () => {
  db.coupon = mkCoupon({ applicableProducts: [OID(99)] });
  await assert.rejects(
    priceCoupon({ code: 'SAVE10', items: [item(P_SHIRT, C_SHIRTS, 1000)] }),
    (e) => e.statusCode === 400 && /not valid for the items in your cart/.test(e.message)
  );
});

test('minimum order is checked on the ELIGIBLE subtotal for a scoped coupon', async () => {
  db.coupon = mkCoupon({ applicableProducts: [P_MUG], minOrderAmount: 600 });
  const items = [item(P_SHIRT, C_SHIRTS, 5000), item(P_MUG, C_HOME, 500)];
  await assert.rejects(
    priceCoupon({ code: 'SAVE10', items }),
    (e) => e.statusCode === 400 && /Minimum ₹600 of eligible items/.test(e.message)
  );
});

test('unscoped minimum order keeps the old message', async () => {
  db.coupon = mkCoupon({ minOrderAmount: 5000 });
  await assert.rejects(
    priceCoupon({ code: 'SAVE10', items: [item(P_MUG, C_HOME, 500)] }),
    (e) => e.message === 'Minimum order amount ₹5000 required'
  );
});

test('fixed discount never exceeds the eligible subtotal (no negative totals)', async () => {
  db.coupon = mkCoupon({ type: 'fixed', value: 800, applicableProducts: [P_MUG] });
  const r = await priceCoupon({ code: 'SAVE10', items: [item(P_SHIRT, C_SHIRTS, 5000), item(P_MUG, C_HOME, 500)] });
  assert.equal(r.discount, 500);
});

test('maxDiscount cap still applies on the eligible subtotal', async () => {
  db.coupon = mkCoupon({ value: 50, maxDiscount: 120 });
  const r = await priceCoupon({ code: 'SAVE10', items: [item(P_SHIRT, C_SHIRTS, 1000)] });
  assert.equal(r.discount, 120);
});

test('invalid code, exhausted limit and per-user limit keep their messages', async () => {
  await assert.rejects(priceCoupon({ code: 'NOPE', items: [item(P_MUG, C_HOME, 500)] }), /Invalid or expired coupon/);

  db.coupon = mkCoupon({ usageLimit: 5, usedCount: 5 });
  await assert.rejects(priceCoupon({ code: 'SAVE10', items: [item(P_MUG, C_HOME, 500)] }), /Coupon usage limit exceeded/);

  db.coupon = mkCoupon({ usedBy: [{ userId: 'u1' }], usedCount: 1 });
  await assert.rejects(
    priceCoupon({ code: 'SAVE10', items: [item(P_MUG, C_HOME, 500)], who: { userId: 'u1' } }),
    /You have already used this coupon/
  );
  // guest at cart stage (who = null): per-user check is skipped (happens at order time with phone)
  const r = await priceCoupon({ code: 'SAVE10', items: [item(P_MUG, C_HOME, 500)], who: null });
  assert.equal(r.discount, 50);
});

test('couponHasScope', () => {
  assert.equal(couponHasScope(mkCoupon()), false);
  assert.equal(couponHasScope(mkCoupon({ applicableCategories: [C_HOME] })), true);
});

// ── controllers ──────────────────────────────────────────────

test('applyCoupon uses LIVE prices, not the cart snapshot', async () => {
  const it = item(P_MUG, C_HOME, 500, 2);
  it.product.price = 800; // admin raised the price after the item was added
  db.cart = mkCart([it]);
  const r = await run(applyCoupon, { user: { _id: 'u1' }, body: { code: 'SAVE10' } });
  assert.equal(r.err, null);
  assert.equal(r.body.data.subtotal, 1600);
  assert.equal(r.body.data.discount, 160);
  assert.equal(db.cart.couponCode, 'SAVE10');
  assert.equal(db.cart.couponDiscount, 160);
});

test('applyCoupon reports scope info for a scoped coupon', async () => {
  db.coupon = mkCoupon({ applicableProducts: [P_MUG] });
  db.cart = mkCart([item(P_SHIRT, C_SHIRTS, 1000), item(P_MUG, C_HOME, 500)]);
  const r = await run(applyCoupon, { user: { _id: 'u1' }, body: { code: 'SAVE10' } });
  assert.equal(r.body.data.scoped, true);
  assert.equal(r.body.data.eligibleSubtotal, 500);
  assert.equal(r.body.data.discount, 50);
  assert.equal(r.body.data.total, 1450);
});

test('validateCoupon tells the storefront the coupon is scoped', async () => {
  db.coupon = mkCoupon({ applicableCategories: [C_HOME] });
  const r = await run(validateCoupon, { user: { _id: 'u1' }, body: { code: 'SAVE10' } });
  assert.equal(r.body.data.scoped, true);
});

test('getCart re-tolls a saved coupon: quantity change updates the discount', async () => {
  db.cart = mkCart([item(P_MUG, C_HOME, 500, 4)], { couponCode: 'SAVE10', couponDiscount: 50 });
  const r = await run(getCart, { user: { _id: 'u1' } });
  assert.equal(r.err, null);
  assert.equal(db.cart.couponDiscount, 200);
  assert.equal(db.cart.saved, true);
  assert.equal(r.body.data.couponRemoved, null);
});

test('getCart drops a scoped coupon once its product leaves the cart and says why', async () => {
  db.coupon = mkCoupon({ applicableProducts: [P_MUG] });
  db.cart = mkCart([item(P_SHIRT, C_SHIRTS, 1000)], { couponCode: 'SAVE10', couponDiscount: 50 });
  const r = await run(getCart, { user: { _id: 'u1' } });
  assert.equal(db.cart.couponCode, null);
  assert.equal(db.cart.couponDiscount, 0);
  assert.equal(db.cart.saved, true);
  assert.match(r.body.data.couponRemoved, /not valid for the items in your cart/);
});

test('getCart leaves a still-correct coupon alone (no needless save)', async () => {
  db.cart = mkCart([item(P_MUG, C_HOME, 500, 2)], { couponCode: 'SAVE10', couponDiscount: 100 });
  await run(getCart, { user: { _id: 'u1' } });
  assert.equal(db.cart.saved, undefined);
});

test('revalidateCartCoupon does nothing for a cart without a coupon', async () => {
  const r = await revalidateCartCoupon(mkCart([item(P_MUG, C_HOME, 500)]));
  assert.deepEqual(r, { changed: false, removedReason: null });
});

// ── validators ───────────────────────────────────────────────

test('create/update validators accept scope lists and reject bad ids', () => {
  const base = { code: 'SCOPE10', type: 'percentage', value: 10, expiresAt: new Date(Date.now() + 86400000) };

  assert.equal(createCouponSchema.validate({ ...base, applicableProducts: [P_MUG], applicableCategories: [C_HOME] }).error, undefined);
  assert.ok(createCouponSchema.validate({ ...base, applicableProducts: ['not-an-id'] }).error);
  assert.ok(createCouponSchema.validate({ ...base, applicableProducts: [P_MUG, P_MUG] }).error); // duplicate

  assert.equal(updateCouponSchema.validate({ applicableProducts: [P_MUG], applicableCategories: [] }).error, undefined);
  assert.ok(updateCouponSchema.validate({ applicableCategories: ['zzz'] }).error);
});

// ── dedupe guard ─────────────────────────────────────────────

test('discount maths lives only in the shared service (no second copy in controllers)', () => {
  for (const f of ['../src/controllers/coupon.controller.js', '../src/controllers/order.controller.js']) {
    const src = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/coupon\.value\) \/ 100/.test(src), `${f} still calculates discounts itself`);
    assert.ok(!/const validateCoupon = async \(/.test(src), `${f} still has its own validateCoupon helper`);
  }
});

import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────
// Round 5 / Group 6A — Product variants (admin CRUD + integrity rules).
// In-memory fakes (no MongoDB), so these tests check OUR rules: unique options/SKU,
// derived Product price/stock, deactivate-instead-of-delete, cart/price guards.
// ─────────────────────────────────────────────────────────────
let seq = 0;
const oid = () => (++seq).toString(16).padStart(24, '0');
const same = (a, b) => String(a) === String(b);

const db = { products: new Map(), variants: [], orders: [], carts: [], cartPulls: [] };

const matches = (doc, filter) => Object.entries(filter).every(([k, c]) => {
  if (c && typeof c === 'object' && '$ne' in c) return !same(doc[k], c.$ne);
  return same(doc[k], c);
});
const chain = (value) => {
  const t = { sort: () => t, session: () => t, lean: () => t, populate: () => t, select: () => t, then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return t;
};

class FakeVariant { constructor(d) { Object.assign(this, d); } async save() { return this; } }
const ProductVariant = {
  find: (f = {}) => chain(db.variants.filter((v) => matches(v, f))),
  findOne: async (f) => db.variants.find((v) => matches(v, f)) || null,
  findById: async (id) => db.variants.find((v) => same(v._id, id)) || null,
  create: async (d) => { const v = new FakeVariant({ _id: oid(), ...d }); db.variants.push(v); return v; },
  deleteOne: async ({ _id }) => { db.variants = db.variants.filter((v) => !same(v._id, _id)); },
};
const Product = {
  findById: async (id) => db.products.get(String(id)) || null,
  findOne: async ({ sku }) => [...db.products.values()].find((p) => p.sku === sku) || null,
  findByIdAndUpdate: (id, upd) => {
    const p = db.products.get(String(id));
    Object.assign(p, upd);
    db.lastProductUpdate = upd;
    return chain(p);
  },
};
const Order = {
  exists: async (f) => (db.orders.some((o) => o.items.some((i) => same(i.variant, f['items.variant']))) ? { _id: 'x' } : null),
};
const Cart = {
  updateMany: async (filter, update) => { db.cartPulls.push({ filter, update }); },
  findOne: () => chain(null),
  create: async (d) => {
    const c = { _id: oid(), ...d, items: [], save: async () => {} };
    db.carts.push(c);
    return c;
  },
  findById: () => chain({ items: [], totalAmount: 0, totalItems: 0 }),
};
const stub = {};
mock.module('../src/models/index.js', {
  namedExports: { Product, ProductVariant, Order, Cart, Category: stub, User: stub, Address: stub, Wishlist: stub, Review: stub, Coupon: stub, Transaction: stub, Banner: stub, Notification: stub, LoyaltyPoints: stub, Settings: stub, Otp: stub },
});

const V = await import('../src/controllers/variant.controller.js');
const C = await import('../src/controllers/cart.controller.js');
const P = await import('../src/controllers/product.controller.js');
const { computeVariantSummary } = await import('../src/services/variantSync.service.js');
const { refreshCartItemPrices } = await import('../src/utils/cartPricing.js');
const { createVariantSchema, updateVariantSchema } = await import('../src/validators/variant.validator.js');

const call = async (fn, { params = {}, body = {}, headers = {} } = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let err = null;
  await fn({ params, body, headers, user: null }, res, (e) => { err = e; });
  return { err, res, data: res.body?.data };
};

let pid;
beforeEach(() => {
  db.products = new Map(); db.variants = []; db.orders = []; db.carts = []; db.cartPulls = [];
  pid = oid();
  db.products.set(pid, { _id: pid, name: 'Kurta', price: 999, comparePrice: 0, stock: 0, hasVariants: false, sku: 'KURTA-1', images: ['a.jpg', 'b.jpg'] });
});

const add = (body, productId = pid) => call(V.createVariant, { params: { productId }, body });
const red = { options: [{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'XL' }], price: 799, comparePrice: 999, stock: 5, sku: 'k-red-xl' };

test('computeVariantSummary: cheapest active price, stock of ACTIVE variants only, compare price only if above price', () => {
  const s = computeVariantSummary([
    { price: 900, comparePrice: 1200, stock: 3, isActive: true },
    { price: 700, comparePrice: 700, stock: 4, isActive: true },
    { price: 100, comparePrice: 0, stock: 50, isActive: false },
  ]);
  assert.deepEqual(s, { hasVariants: true, stock: 7, price: 700, comparePrice: 0 });
  assert.deepEqual(computeVariantSummary([{ price: 5, stock: 9, isActive: false }]), { hasVariants: false, stock: 0 });
  assert.deepEqual(computeVariantSummary([]), { hasVariants: false, stock: 0 });
});

test('create: name comes from option values, SKU is upper-cased, product becomes a variant product with derived price/stock', async () => {
  const r = await add(red);
  assert.equal(r.err, null);
  assert.equal(r.res.statusCode, 201);
  assert.equal(r.data.variant.name, 'Red / XL');
  assert.equal(r.data.variant.sku, 'K-RED-XL');
  assert.deepEqual(
    { hasVariants: r.data.product.hasVariants, price: r.data.product.price, comparePrice: r.data.product.comparePrice, stock: r.data.product.stock },
    { hasVariants: true, price: 799, comparePrice: 999, stock: 5 }
  );
});

test('create: a cheaper second variant lowers the product price and stock adds up', async () => {
  await add(red);
  const r = await add({ options: [{ name: 'color', value: 'Blue' }, { name: 'size', value: 'M' }], price: 699, stock: 2 });
  assert.equal(r.err, null);
  assert.equal(r.data.product.price, 699);
  assert.equal(r.data.product.stock, 7);
});

test('create rejects: same combination twice (any letter case), different option names, SKU clash with a variant or a product', async () => {
  await add(red);
  const dup = await add({ options: [{ name: 'size', value: 'xl' }, { name: 'COLOR', value: 'red' }], price: 800 });
  assert.equal(dup.err.statusCode, 400); assert.match(dup.err.message, /already exists/);

  const names = await add({ options: [{ name: 'Colour', value: 'Blue' }, { name: 'Size', value: 'M' }], price: 800 });
  assert.equal(names.err.statusCode, 400); assert.match(names.err.message, /same options: Color, Size/);

  const skuV = await add({ options: [{ name: 'Color', value: 'Green' }, { name: 'Size', value: 'S' }], price: 800, sku: 'K-RED-XL' });
  assert.equal(skuV.err.message, 'SKU already exists');
  const skuP = await add({ options: [{ name: 'Color', value: 'Green' }, { name: 'Size', value: 'S' }], price: 800, sku: 'kurta-1' });
  assert.equal(skuP.err.message, 'SKU already exists');
});

test('create rejects: MRP below price, images that are not the product\'s own, unknown/deleted product, too many variants', async () => {
  const mrp = await add({ ...red, comparePrice: 500 });
  assert.match(mrp.err.message, /Compare price/);
  const img = await add({ ...red, images: ['other.jpg'] });
  assert.match(img.err.message, /product's own images/);
  const ok = await add({ ...red, images: ['b.jpg'] });
  assert.equal(ok.err, null);

  assert.equal((await add(red, oid())).err.statusCode, 404);
  assert.equal((await add(red, 'not-an-id')).err.statusCode, 404);
  db.products.get(pid).deletedAt = new Date();
  assert.equal((await add({ ...red, sku: 'zz' })).err.statusCode, 404);
  db.products.get(pid).deletedAt = undefined;

  for (let i = 0; i < 49; i++) db.variants.push(new FakeVariant({ _id: oid(), productId: pid, options: [{ name: 'Color', value: `c${i}` }, { name: 'Size', value: 'S' }], isActive: true, price: 1, stock: 0 }));
  const many = await add({ options: [{ name: 'Color', value: 'last' }, { name: 'Size', value: 'S' }], price: 1 });
  assert.match(many.err.message, /at most 50/);
});

test('update: price change, deactivate and stock change all resync the product; own SKU can be re-sent', async () => {
  const a = (await add(red)).data.variant;
  const b = (await add({ options: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'M' }], price: 699, stock: 2 })).data.variant;
  const up = (id, body) => call(V.updateVariant, { params: { productId: pid, variantId: id }, body });

  let r = await up(b._id, { price: 850 });
  assert.equal(r.data.product.price, 799); // red is now the cheapest

  r = await up(a._id, { isActive: false });
  assert.deepEqual([r.data.product.price, r.data.product.stock], [850, 2]); // red's stock no longer counts

  r = await up(a._id, { isActive: true, stock: 10, sku: 'K-RED-XL' });
  assert.equal(r.err, null);
  assert.deepEqual([r.data.product.price, r.data.product.stock], [799, 12]);
});

test('update: changing options re-checks duplicates (ignoring itself) and renames the variant', async () => {
  const a = (await add(red)).data.variant;
  const b = (await add({ options: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'M' }], price: 699 })).data.variant;
  const up = (id, body) => call(V.updateVariant, { params: { productId: pid, variantId: id }, body });

  const clash = await up(b._id, { options: [{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'XL' }] });
  assert.match(clash.err.message, /already exists/);

  const same_ = await up(a._id, { options: [{ name: 'Color', value: 'Red' }, { name: 'Size', value: 'XL' }], price: 800 });
  assert.equal(same_.err, null);

  const rename = await up(b._id, { options: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'L' }] });
  assert.equal(rename.data.variant.name, 'Blue / L');
});

test('update/delete: variant of another product or a malformed id gives 404', async () => {
  const other = oid();
  db.products.set(other, { _id: other, name: 'Other', price: 1, stock: 0, hasVariants: false, images: [] });
  const v = (await add(red, other)).data.variant;
  assert.equal((await call(V.updateVariant, { params: { productId: pid, variantId: v._id }, body: { stock: 1 } })).err.statusCode, 404);
  assert.equal((await call(V.deleteVariant, { params: { productId: pid, variantId: v._id } })).err.statusCode, 404);
  assert.equal((await call(V.deleteVariant, { params: { productId: pid, variantId: 'nope' } })).err.statusCode, 404);
});

test('delete: variant without orders is removed and pulled from carts; the product falls back to non-variant when the last one goes', async () => {
  const a = (await add(red)).data.variant;
  const r = await call(V.deleteVariant, { params: { productId: pid, variantId: a._id } });
  assert.equal(r.data.deactivated, false);
  assert.equal(db.variants.length, 0);
  assert.equal(db.cartPulls.length, 1);
  assert.deepEqual([r.data.product.hasVariants, r.data.product.stock], [false, 0]);
});

test('delete: variant that has past orders is only deactivated (order history keeps pointing at it)', async () => {
  const a = (await add(red)).data.variant;
  const b = (await add({ options: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'M' }], price: 699, stock: 2 })).data.variant;
  db.orders.push({ items: [{ variant: a._id }] });
  const r = await call(V.deleteVariant, { params: { productId: pid, variantId: a._id } });
  assert.equal(r.data.deactivated, true);
  assert.equal(db.variants.length, 2);
  assert.equal(db.variants.find((v) => same(v._id, a._id)).isActive, false);
  assert.deepEqual([r.data.product.price, r.data.product.stock], [699, 2]);
  assert.equal(db.cartPulls.length, 1); // deactivated variants also leave carts
  assert.ok(b);
});

test('list: admin sees active and inactive variants', async () => {
  await add(red);
  const b = (await add({ options: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'M' }], price: 699 })).data.variant;
  await call(V.updateVariant, { params: { productId: pid, variantId: b._id }, body: { isActive: false } });
  const r = await call(V.listVariants, { params: { productId: pid } });
  assert.equal(r.data.variants.length, 2);
});

test('validators: create needs options + price, rejects negative stock / fractional stock / duplicate option names; update needs a field', () => {
  assert.equal(createVariantSchema.validate({ price: 5 }).error?.details[0].path[0], 'options');
  assert.ok(createVariantSchema.validate({ options: [{ name: 'Size', value: 'M' }] }).error);
  assert.ok(createVariantSchema.validate({ ...red, stock: -1 }).error);
  assert.ok(createVariantSchema.validate({ ...red, stock: 1.5 }).error);
  assert.ok(createVariantSchema.validate({ ...red, price: -1 }).error);
  assert.ok(createVariantSchema.validate({ options: [{ name: 'Size', value: 'M' }, { name: 'size', value: 'L' }], price: 5 }).error);
  assert.ok(createVariantSchema.validate({ options: [1, 2, 3, 4].map((n) => ({ name: `o${n}`, value: 'x' })), price: 5 }).error);
  assert.equal(createVariantSchema.validate(red).error, undefined);
  assert.ok(updateVariantSchema.validate({}).error);
  assert.equal(updateVariantSchema.validate({ stock: 0 }).error, undefined);
});

// ───────── cart guards ─────────
test('cart add: a variant product needs an option; a variant of ANOTHER product is refused; a valid variant sets the variant price', async () => {
  const a = (await add(red)).data.variant;
  const other = oid();
  db.products.set(other, { _id: other, name: 'Other', price: 50, stock: 9, hasVariants: false, isActive: true, images: [] });
  db.products.get(pid).isActive = true;

  const none = await call(C.addToCart, { body: { productId: pid, quantity: 1 }, headers: { 'x-session-id': 's1' } });
  assert.equal(none.err.statusCode, 400); assert.match(none.err.message, /select an option/);

  const cross = await call(C.addToCart, { body: { productId: other, variantId: a._id, quantity: 1 }, headers: { 'x-session-id': 's1' } });
  assert.equal(cross.err.statusCode, 404);

  const ok = await call(C.addToCart, { body: { productId: pid, variantId: a._id, quantity: 2 }, headers: { 'x-session-id': 's1' } });
  assert.equal(ok.err, null);
  assert.equal(db.carts[0].items[0].price, 799);
  assert.equal(String(db.carts[0].items[0].variant), String(a._id));

  const tooMany = await call(C.addToCart, { body: { productId: pid, variantId: a._id, quantity: 99 }, headers: { 'x-session-id': 's2' } });
  assert.match(tooMany.err.message, /Only 5/);
});

test('cart update: a variant that does not belong to the product is refused (no stock bypass)', async () => {
  const other = oid();
  db.products.set(other, { _id: other, name: 'Other', price: 50, stock: 9, hasVariants: false, isActive: true, images: [] });
  const a = (await add(red)).data.variant;
  const cart = { items: [{ product: other, variant: a._id, quantity: 1 }], save: async () => {} };
  Cart.findOne = () => chain(cart);
  const r = await call(C.updateCartItem, { body: { productId: other, variantId: a._id, quantity: 1 }, headers: { 'x-session-id': 's1' } });
  assert.equal(r.err.statusCode, 404);
  Cart.findOne = () => chain(null);
});

test('refreshCartItemPrices: cart goes to the live variant/product price, reports whether anything changed', () => {
  const cart = { items: [
    { price: 799, variant: { price: 850 }, product: { price: 999 } },
    { price: 100, variant: null, product: { price: 120 } },
    { price: 50, variant: null, product: { price: 50 } },
    { price: 70, variant: null, product: null },
  ] };
  assert.equal(refreshCartItemPrices(cart), true);
  assert.deepEqual(cart.items.map((i) => i.price), [850, 120, 50, 70]);
  assert.equal(refreshCartItemPrices(cart), false);
});

// ───────── product controller: derived fields ─────────
test('product update: price/stock/comparePrice/hasVariants are ignored for a variant product but other fields go through', async () => {
  const a = (await add(red)).data.variant;
  assert.ok(a);
  await call(P.updateProduct, { params: { id: pid }, body: { brand: 'Luxora', price: 1, stock: 999, comparePrice: 5, hasVariants: false } });
  assert.deepEqual(db.lastProductUpdate, { brand: 'Luxora' });
});

test('product update: a plain product can still change its own price and stock, but not flip hasVariants by hand', async () => {
  await call(P.updateProduct, { params: { id: pid }, body: { price: 1200, stock: 7, hasVariants: true } });
  assert.deepEqual(db.lastProductUpdate, { price: 1200, stock: 7 });
});

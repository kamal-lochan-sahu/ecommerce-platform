import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Round 5 Group 4: data the customer pages depend on.
//  - My Orders must keep the item snapshot (name + image)
//  - Order detail must populate the variant name (not show a raw ObjectId)
//  - Product listing brand filter must accept several brands ("Nike,Adidas")
//  - Confirmation email must show the coupon discount (pricing.couponDiscount)
// Real controllers/templates, fake DB + mail provider.

const rec = { find: null, findOne: null, populates: [], selects: [], productFilter: null, mail: [] };
let orderDoc;

// Minimal chainable query: await-able, records populate()/select() calls
const chain = (result) => {
  const c = {
    populate(path, fields) { rec.populates.push([path, fields]); return c; },
    select(s) { rec.selects.push(s); return c; },
    sort() { return c; },
    skip() { return c; },
    limit() { return c; },
    then(res, rej) { return Promise.resolve(result).then(res, rej); },
  };
  return c;
};

const stub = () => ({});
mock.module('../src/models/index.js', {
  namedExports: {
    Order: {
      find: (f) => { rec.find = f; return chain([{ _id: 'o1' }]); },
      findOne: (f) => { rec.findOne = f; return chain(orderDoc); },
      countDocuments: async () => 1,
    },
    Product: {
      find: (f) => { rec.productFilter = f; return chain([]); },
      countDocuments: async () => 0,
    },
    Category: { findOne: () => ({ select: async () => null }) },
    Settings: { getSingleton: async () => ({ storeName: 'Sharma Sarees', storeEmail: 'help@sharmasarees.in' }) },
    Cart: stub(), ProductVariant: stub(), Address: stub(), Coupon: stub(),
    Transaction: stub(), LoyaltyPoints: stub(), Notification: stub(), User: stub(),
  },
});
mock.module('../src/services/orderLifecycle.service.js', {
  namedExports: {
    cancelOrderAndRestore: async () => ({}), markOrderPaid: async () => ({}),
    flagLatePayment: async () => ({}), sendConfirmationEmailFor: async () => ({}),
  },
});
mock.module('../src/services/orderNotifications.service.js', {
  namedExports: { notifyOrderEventInBackground: () => {} },
});
mock.module('../src/utils/email.js', { namedExports: { sendEmail: async () => ({}) } });
mock.module('../src/config/razorpay.js', { namedExports: { getRazorpay: () => ({}) } });
mock.module('../src/config/stripe.js', { namedExports: { getStripe: () => ({}) } });
mock.module('../src/services/messaging.service.js', {
  namedExports: {
    sendMail: async (m) => { rec.mail.push(m); return { success: true, messageId: 'm1' }; },
    sendSms: async () => ({ success: true }),
  },
});
mock.module('../src/utils/logger.js', { defaultExport: { info() {}, warn() {}, error() {} } });

process.env.FRONTEND_URL = 'https://shop.example.com';

const { getMyOrders, getOrderById } = await import('../src/controllers/order.controller.js');
const { getProducts } = await import('../src/controllers/product.controller.js');
const { sendOrderConfirmationEmail } = await import('../src/services/email.service.js');

const call = async (handler, req) => {
  const res = { body: null, json(b) { this.body = b; return this; }, status() { return this; } };
  await handler({ query: {}, params: {}, user: { _id: 'u1' }, ...req }, res, (e) => { throw e; });
  return res.body;
};

beforeEach(() => {
  rec.find = rec.findOne = rec.productFilter = null;
  rec.populates.length = 0; rec.selects.length = 0; rec.mail.length = 0;
  orderDoc = { _id: 'o1', userId: 'u1' };
});

test('My Orders keeps the item snapshot (image is no longer stripped out)', async () => {
  const body = await call(getMyOrders, { query: { status: 'placed' } });
  assert.deepEqual(rec.find, { userId: 'u1', orderStatus: 'placed' });
  assert.ok(!rec.selects.some((s) => String(s).includes('items.image')), 'items.image must not be excluded');
  assert.equal(body.data.pagination.totalPages, 1);
});

test('Order detail populates the variant name next to the product', async () => {
  const body = await call(getOrderById, { params: { id: 'o1' } });
  assert.deepEqual(rec.findOne, { _id: 'o1', userId: 'u1' });
  assert.ok(rec.populates.some(([p, f]) => p === 'items.variant' && f === 'name'));
  assert.ok(rec.populates.some(([p]) => p === 'items.product'));
  assert.equal(body.data.order._id, 'o1');
});

test('Order detail of someone else\'s order is a 404', async () => {
  orderDoc = null;
  await assert.rejects(() => call(getOrderById, { params: { id: 'o9' } }), (e) => e.statusCode === 404);
});

test('brand filter: several brands become one case-insensitive exact match each', async () => {
  await call(getProducts, { query: { brand: 'Nike, Adi+das' } });
  const list = rec.productFilter.brand.$in;
  assert.equal(list.length, 2);
  const matches = (s) => list.some((re) => re.test(s));
  assert.ok(matches('nike'));
  assert.ok(matches('ADI+DAS'));       // "+" is escaped, not a regex operator
  assert.ok(!matches('adiidas'));
  assert.ok(!matches('Nike Air'));     // exact brand, not "contains"
});

test('brand filter: a single brand and junk input still work', async () => {
  await call(getProducts, { query: { brand: 'Fabindia' } });
  assert.equal(rec.productFilter.brand.$in.length, 1);
  await call(getProducts, { query: { brand: ' , ,' } });
  assert.equal(rec.productFilter.brand, undefined);
  await call(getProducts, { query: { brand: '(' } });   // would have been an invalid regex before
  assert.equal(rec.productFilter.brand.$in.length, 1);
});

test('confirmation email shows the coupon discount that createOrder stores', async () => {
  const order = {
    _id: 'o1', orderNumber: 'ORD-9', paymentMethod: 'cod', createdAt: new Date(),
    items: [{ name: 'Silk Saree', quantity: 1, price: 1000 }],
    pricing: { subtotal: 1000, shippingCharge: 0, tax: 0, couponDiscount: 100, total: 900 },
    couponCode: 'SAVE10',
    shippingAddress: { fullName: 'Krishna', addressLine1: 'x', city: 'Pune', state: 'MH', pincode: '411001' },
  };
  await sendOrderConfirmationEmail(order, { name: 'Krishna', email: 'k@example.com' });
  assert.equal(rec.mail.length, 1);
  assert.match(rec.mail[0].html, /SAVE10/);
  assert.match(rec.mail[0].html, /-₹100/);
});

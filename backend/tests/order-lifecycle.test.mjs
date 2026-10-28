import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

// ───────── In-memory fakes (real MongoDB transactions need a replica set,
// so these tests check OUR logic: who restores stock, who is allowed to cancel, idempotency) ─────────
const db = { orders: new Map(), products: new Map(), variants: new Map(), coupons: new Map(), transactions: new Map() };
const sent = { emails: [], notifications: [], sms: [] };

const isObj = (c) => c && typeof c === 'object' && !(c instanceof Date) && !Array.isArray(c);
const matchVal = (v, c) => {
  if (!isObj(c)) return String(v) === String(c);
  return Object.entries(c).every(([op, x]) => {
    if (op === '$in') return x.map(String).includes(String(v));
    if (op === '$nin') return !x.map(String).includes(String(v));
    if (op === '$ne') return String(v) !== String(x);
    if (op === '$lt') return v < x;
    return false;
  });
};
const matches = (doc, filter) => Object.entries(filter).every(([k, c]) => matchVal(doc[k], c));
const applyUpdate = (doc, update) => {
  for (const [k, v] of Object.entries(update)) {
    if (k === '$push') for (const [f, item] of Object.entries(v)) doc[f].push(item);
    else if (k === '$inc') for (const [f, n] of Object.entries(v)) doc[f] = (doc[f] || 0) + n;
    else doc[k] = v;
  }
};
const clone = (o) => (o ? structuredClone(o) : o);

const Order = {
  findOneAndUpdate: async (filter, update) => {
    const doc = [...db.orders.values()].find((o) => matches(o, filter));
    if (!doc) return null;
    applyUpdate(doc, update);
    return clone(doc);
  },
  findById: async (id) => clone(db.orders.get(String(id))),
  find: (filter) => {
    const rows = [...db.orders.values()].filter((o) => matches(o, filter));
    const chain = { select: () => chain, limit: () => chain, lean: async () => rows.map(clone) };
    return chain;
  },
};
const incStore = (store) => ({
  findByIdAndUpdate: async (id, update) => { applyUpdate(store.get(String(id)), update); },
});
const Product = incStore(db.products);
const ProductVariant = incStore(db.variants);
const Coupon = {
  findOne: ({ code }) => {
    const c = [...db.coupons.values()].find((x) => x.code === code);
    return { session: () => c };
  },
};
const Transaction = {
  findOne: async ({ gatewayOrderId }) => [...db.transactions.values()].find((t) => t.gatewayOrderId === gatewayOrderId) || null,
  findByIdAndUpdate: async (id, upd) => { Object.assign(db.transactions.get(String(id)), upd); },
  findOneAndUpdate: async (f, upd) => {
    const t = [...db.transactions.values()].find((x) => x.gatewayOrderId === (f.gatewayOrderId ?? x.gatewayOrderId));
    if (t) Object.assign(t, upd);
  },
};
const Notification = { create: async (n) => { sent.notifications.push(n); } };
const User = { findById: () => ({ select: () => Promise.resolve({ _id: 'u1', name: 'Krishna', email: 'k@example.com' }) }) };

mock.module('mongoose', {
  defaultExport: { startSession: async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} }) },
});
mock.module('../src/models/index.js', {
  namedExports: { Order, Product, ProductVariant, Coupon, Transaction, Notification, User, Cart: {}, Address: {}, LoyaltyPoints: {}, Settings: {} },
});
mock.module('../src/services/email.service.js', {
  namedExports: { sendOrderConfirmationEmail: async (order) => { sent.emails.push(order.orderNumber); } },
});
mock.module('../src/services/orderNotifications.service.js', {
  namedExports: { notifyOrderEventInBackground: (event, order) => { sent.sms.push([event, order.orderNumber]); } },
});
mock.module('../src/utils/logger.js', { defaultExport: { info() {}, warn() {}, error() {} } });
mock.module('../src/config/razorpay.js', { namedExports: { getRazorpay: () => ({}) } });
mock.module('../src/config/stripe.js', { namedExports: { getStripe: () => ({}) } });
mock.module('../src/utils/email.js', { namedExports: { sendEmail: async () => ({}) } });

const L = await import('../src/services/orderLifecycle.service.js');
const { razorpayWebhook } = await import('../src/controllers/order.controller.js');
const { cancelStaleOrders } = await import('../src/jobs/staleOrders.job.js');
const { cancelOrder } = await import('../src/controllers/order.controller.js');
const { ensureBody } = await import('../src/middleware/ensureBody.middleware.js');

const tick = () => new Promise((r) => setImmediate(r));
const mkOrder = (over = {}) => ({
  _id: 'o1', orderNumber: 'ORD-1', userId: 'u1', orderStatus: 'placed', paymentStatus: 'pending', paymentMethod: 'cod',
  pricing: { total: 1180 }, statusHistory: [], couponCode: null, createdAt: new Date(),
  items: [{ product: 'p1', variant: null, quantity: 2 }],
  ...over,
});

beforeEach(() => {
  for (const m of Object.values(db)) m.clear();
  sent.emails.length = 0; sent.notifications.length = 0; sent.sms.length = 0;
  db.products.set('p1', { stock: 8, totalSold: 2 });
  db.orders.set('o1', mkOrder());
  delete process.env.RAZORPAY_WEBHOOK_SECRET; delete process.env.STALE_ORDER_MINUTES;
});

// ───────── cancelOrderAndRestore ─────────
test('cancel gives stock back and reverses totalSold (simple product)', async () => {
  const r = await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed', 'confirmed'], reason: 'x' });
  assert.equal(r.cancelled, true);
  assert.deepEqual(db.products.get('p1'), { stock: 10, totalSold: 0 });
  assert.equal(db.orders.get('o1').orderStatus, 'cancelled');
  assert.equal(db.orders.get('o1').statusHistory.at(-1).status, 'cancelled');
});

test('variant item: stock goes back to the VARIANT, totalSold to the product, product stock untouched', async () => {
  db.variants.set('v1', { stock: 3 });
  db.orders.set('o1', mkOrder({ items: [{ product: 'p1', variant: 'v1', quantity: 2 }] }));
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'x' });
  assert.equal(db.variants.get('v1').stock, 5);
  assert.deepEqual(db.products.get('p1'), { stock: 8, totalSold: 0 });
});

test('cancelling twice restores stock only ONCE', async () => {
  const a = await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'x' });
  const b = await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'x' });
  assert.equal(a.cancelled, true); assert.equal(b.cancelled, false);
  assert.equal(db.products.get('p1').stock, 10);
});

test('status not in allowedFrom (e.g. delivered) is not cancelled and stock is untouched', async () => {
  db.orders.get('o1').orderStatus = 'delivered';
  const r = await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed', 'confirmed', 'processing', 'shipped'], reason: 'x' });
  assert.equal(r.cancelled, false);
  assert.equal(db.products.get('p1').stock, 8);
});

test("another user's order cannot be cancelled (customer path)", async () => {
  const r = await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], userId: 'someone-else', reason: 'x' });
  assert.equal(r.cancelled, false);
  assert.equal(db.orders.get('o1').orderStatus, 'placed');
});

test('onlyIfUnpaid: a PAID order is never cancelled by a gateway failure path', async () => {
  db.orders.get('o1').paymentStatus = 'paid';
  const r = await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], onlyIfUnpaid: true, markPaymentFailed: true, reason: 'bad signature' });
  assert.equal(r.cancelled, false);
  assert.equal(db.orders.get('o1').orderStatus, 'placed');
  assert.equal(db.orders.get('o1').paymentStatus, 'paid');
});

test('markPaymentFailed sets paymentStatus=failed; notify creates a customer notification', async () => {
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], onlyIfUnpaid: true, markPaymentFailed: true, notify: true, reason: 'Stripe session expired' });
  assert.equal(db.orders.get('o1').paymentStatus, 'failed');
  assert.equal(sent.notifications.length, 1);
  assert.match(sent.notifications[0].message, /ORD-1/);
});

// ───────── coupon revert ─────────
const mkCoupon = (over = {}) => ({
  code: 'SAVE10', usedCount: 3, usageLimit: 5, isActive: true, expiresAt: new Date(Date.now() + 864e5),
  usedBy: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u1' }], saved: 0, save: async function () { this.saved++; }, ...over,
});

test('coupon: usedCount -1 and exactly ONE usedBy entry of this user removed', async () => {
  db.coupons.set('c1', mkCoupon());
  db.orders.set('o1', mkOrder({ couponCode: 'save10' })); // lowercase as typed
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'x' });
  const c = db.coupons.get('c1');
  assert.equal(c.usedCount, 2);
  assert.deepEqual(c.usedBy.map((u) => u.userId), ['u1', 'u2']);
  assert.equal(c.saved, 1);
});

test('coupon exhausted by the cron (inactive) is re-activated when a cancel frees a slot', async () => {
  db.coupons.set('c1', mkCoupon({ usedCount: 5, isActive: false }));
  db.orders.set('o1', mkOrder({ couponCode: 'SAVE10' }));
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'x' });
  assert.equal(db.coupons.get('c1').isActive, true);
});

test('expired coupon stays inactive after a cancel', async () => {
  db.coupons.set('c1', mkCoupon({ usedCount: 5, isActive: false, expiresAt: new Date(Date.now() - 1000) }));
  db.orders.set('o1', mkOrder({ couponCode: 'SAVE10' }));
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'x' });
  assert.equal(db.coupons.get('c1').isActive, false);
});

// ───────── markOrderPaid / late payment ─────────
test('markOrderPaid: placed -> confirmed+paid, one notification, one email', async () => {
  const r = await L.markOrderPaid('o1');
  await tick();
  assert.equal(r.status, 'paid');
  assert.equal(db.orders.get('o1').orderStatus, 'confirmed');
  assert.equal(db.orders.get('o1').paymentStatus, 'paid');
  assert.equal(sent.notifications.length, 1);
  assert.deepEqual(sent.emails, ['ORD-1']);
  assert.deepEqual(sent.sms, [['placed', 'ORD-1']], 'confirmation SMS goes out exactly once, with the email');
});

test('markOrderPaid twice (verify + webhook race) is idempotent: no duplicate email/notification', async () => {
  await L.markOrderPaid('o1');
  const second = await L.markOrderPaid('o1');
  await tick();
  assert.equal(second.status, 'already_paid');
  assert.equal(sent.notifications.length, 1);
  assert.equal(sent.emails.length, 1);
  assert.equal(sent.sms.length, 1, 'no duplicate confirmation SMS either');
});

test('markOrderPaid on a CANCELLED order does not revive it; flagLatePayment marks refund needed', async () => {
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'stale' });
  const r = await L.markOrderPaid('o1');
  assert.equal(r.status, 'cancelled');
  assert.equal(db.orders.get('o1').orderStatus, 'cancelled');
  await L.flagLatePayment('o1', 'pay_1');
  assert.equal(db.orders.get('o1').paymentStatus, 'paid');
  assert.match(db.orders.get('o1').statusHistory.at(-1).message, /refund required/);
  assert.equal(sent.emails.length, 0);
});

// ───────── Razorpay webhook handler ─────────
const SECRET = 'whsec_test';
const call = async (rawObj, { secret = SECRET, sig } = {}) => {
  const raw = Buffer.from(typeof rawObj === 'string' ? rawObj : JSON.stringify(rawObj));
  const req = { body: raw, headers: { 'x-razorpay-signature': sig ?? crypto.createHmac('sha256', secret).update(raw).digest('hex') } };
  const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  await razorpayWebhook(req, res, (e) => { throw e; });
  return res;
};
const capturedEvent = (over = {}) => ({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay_1', order_id: 'rzp_o1', amount: 118000, currency: 'INR', ...over } } },
});
const seedOnline = () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay' }));
  db.transactions.set('t1', { _id: 't1', gatewayOrderId: 'rzp_o1', gateway: 'razorpay', order: 'o1', status: 'created' });
};

test('webhook is closed (503) when RAZORPAY_WEBHOOK_SECRET is not set', async () => {
  seedOnline();
  const res = await call(capturedEvent());
  assert.equal(res.code, 503);
  assert.equal(db.orders.get('o1').paymentStatus, 'pending');
});

test('webhook rejects a bad signature (400) and does not touch the order', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; seedOnline();
  const res = await call(capturedEvent(), { sig: 'deadbeef' });
  assert.equal(res.code, 400);
  const res2 = await call(capturedEvent(), { secret: 'wrong-secret' });
  assert.equal(res2.code, 400);
  assert.equal(db.orders.get('o1').paymentStatus, 'pending');
});

test('webhook payment.captured confirms the order; a Razorpay retry does not duplicate anything', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; seedOnline();
  const res = await call(capturedEvent());
  await tick();
  assert.equal(res.code, 200);
  assert.equal(db.orders.get('o1').orderStatus, 'confirmed');
  assert.equal(db.orders.get('o1').paymentStatus, 'paid');
  assert.equal(db.transactions.get('t1').status, 'success');
  assert.equal(db.transactions.get('t1').gatewayPaymentId, 'pay_1');
  await call(capturedEvent()); await tick();
  assert.equal(sent.emails.length, 1);
  assert.equal(sent.notifications.length, 1);
});

test('webhook with the WRONG amount does not confirm the order', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; seedOnline();
  const res = await call(capturedEvent({ amount: 100 }));
  assert.equal(res.code, 200);
  assert.equal(db.orders.get('o1').paymentStatus, 'pending');
  assert.equal(db.orders.get('o1').orderStatus, 'placed');
});

test('webhook for an already-cancelled order keeps it cancelled and flags the refund', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; seedOnline();
  await L.cancelOrderAndRestore('o1', { allowedFrom: ['placed'], reason: 'stale' });
  await call(capturedEvent());
  assert.equal(db.orders.get('o1').orderStatus, 'cancelled');
  assert.equal(db.orders.get('o1').paymentStatus, 'paid');
  assert.match(db.orders.get('o1').statusHistory.at(-1).message, /refund required/);
});

test('webhook: payment.failed / unknown events are acknowledged (200) and change nothing', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET; seedOnline();
  let res = await call({ event: 'payment.failed', payload: { payment: { entity: { order_id: 'rzp_o1' } } } });
  assert.equal(res.code, 200);
  res = await call({ event: 'refund.created', payload: {} });
  assert.equal(res.code, 200);
  assert.equal(db.orders.get('o1').orderStatus, 'placed');
});

// ───────── stale pending orders job ─────────
test('stale job cancels ONLY old unpaid online orders (never COD, never fresh, never paid) and frees stock', async () => {
  const old = new Date(Date.now() - 3 * 60 * 60 * 1000);
  db.products.set('p2', { stock: 5, totalSold: 1 });
  db.orders.clear();
  db.orders.set('stale', mkOrder({ _id: 'stale', orderNumber: 'ORD-S', paymentMethod: 'razorpay', createdAt: old, items: [{ product: 'p2', quantity: 1 }] }));
  db.orders.set('cod', mkOrder({ _id: 'cod', orderNumber: 'ORD-C', paymentMethod: 'cod', createdAt: old }));
  db.orders.set('fresh', mkOrder({ _id: 'fresh', orderNumber: 'ORD-F', paymentMethod: 'stripe', createdAt: new Date() }));
  db.orders.set('paid', mkOrder({ _id: 'paid', orderNumber: 'ORD-P', paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'confirmed', createdAt: old }));

  const r = await cancelStaleOrders();
  assert.deepEqual(r, { found: 1, cancelled: 1 });
  assert.equal(db.orders.get('stale').orderStatus, 'cancelled');
  assert.equal(db.orders.get('stale').paymentStatus, 'failed');
  assert.deepEqual(db.products.get('p2'), { stock: 6, totalSold: 0 });
  for (const id of ['cod', 'fresh', 'paid']) assert.notEqual(db.orders.get(id).orderStatus, 'cancelled', id);
});

// ───────── Express 5: request WITHOUT a body (the real frontend sends PUT /orders/:id/cancel with no body) ─────────
const startApp = async ({ withFix }) => {
  const app = express();
  app.use(express.json());
  if (withFix) app.use(ensureBody);
  app.use((req, res, next) => { req.user = { _id: 'u1' }; next(); });
  app.put('/orders/:id/cancel', cancelOrder);
  app.use((err, req, res, next) => res.status(500).json({ message: err.message })); // eslint-disable-line no-unused-vars
  return new Promise((resolve) => { const server = app.listen(0, () => resolve(server)); });
};

test('customer cancel with NO request body works (real Express app + ensureBody) and restores stock', async () => {
  const server = await startApp({ withFix: true });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/orders/o1/cancel`, { method: 'PUT' });
    assert.equal(res.status, 200);
    assert.equal(db.orders.get('o1').orderStatus, 'cancelled');
    assert.equal(db.products.get('p1').stock, 10);
  } finally { server.close(); }
});

test('control: WITHOUT ensureBody the same request crashes with 500 (this is the bug the live test caught)', async () => {
  const server = await startApp({ withFix: false });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/orders/o1/cancel`, { method: 'PUT' });
    assert.equal(res.status, 500);
    assert.equal(db.orders.get('o1').orderStatus, 'placed');
  } finally { server.close(); }
});

test('ensureBody leaves an existing body alone and fills a missing one', () => {
  const a = { body: { x: 1 } }; ensureBody(a, {}, () => {});
  const b = {}; ensureBody(b, {}, () => {});
  assert.deepEqual(a.body, { x: 1 });
  assert.deepEqual(b.body, {});
});

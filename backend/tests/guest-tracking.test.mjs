import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────
// Round 5 / Group 5B — public order tracking + claiming guest orders after signup.
// In-memory fakes: we test OUR rules (who may see which order, what is exposed, what gets claimed).
// ─────────────────────────────────────────────────────────────
const db = { orders: [], users: [], updates: { orders: [], txns: [] } };
const chain = (value) => { const c = { select: () => c, lean: async () => value }; return c; };

mock.module('../src/models/index.js', {
  namedExports: {
    Order: {
      findOne: ({ orderNumber }) => chain(db.orders.find((o) => o.orderNumber === orderNumber) || null),
      find: (filter) => {
        db.lastFind = filter;
        const rows = db.orders.filter((o) => !o.userId && filter.$or.some((c) => Object.entries(c).every(([k, v]) => (k === 'guestContact.email' ? o.guestContact?.email === v : o.guestContact?.phone === v))));
        return chain(rows);
      },
      updateMany: async (filter, update) => { db.updates.orders.push({ filter, update }); return { modifiedCount: filter._id.$in.length }; },
    },
    Transaction: { updateMany: async (filter, update) => { db.updates.txns.push({ filter, update }); } },
    User: { findById: () => chain(db.users[0] || null) },
  },
});
mock.module('../src/utils/logger.js', { defaultExport: { info() {}, warn() {}, error() {} } });

const { trackOrder, normalizeContact } = await import('../src/controllers/orderTracking.controller.js');
const { claimGuestOrders } = await import('../src/services/guestOrderClaim.service.js');
const { trackOrderSchema } = await import('../src/validators/order.validator.js');

const run = async (handler, body) => {
  const out = { code: 200, body: null, err: null };
  const res = { status(c) { out.code = c; return this; }, json(b) { out.body = b; return this; } };
  await handler({ body, headers: {}, params: {}, query: {} }, res, (e) => { out.err = e; });
  return out;
};

const guestOrder = (over = {}) => ({
  _id: 'o1', orderNumber: 'ORD-12345678-123', userId: null, orderStatus: 'shipped', paymentMethod: 'cod', paymentStatus: 'pending',
  createdAt: new Date('2026-11-01'), expectedDelivery: new Date('2026-11-08'),
  guestContact: { name: 'Asha Guest', email: 'asha@example.com', phone: '9123456789', phoneVerified: true },
  shippingAddress: { fullName: 'Asha Guest', phone: '9123456789', addressLine1: '12 Secret Lane', city: 'Bhubaneswar', state: 'Odisha', pincode: '751007' },
  items: [{ name: 'Watch', image: 'w.jpg', quantity: 1, price: 699, total: 699, product: 'p-secret' }],
  pricing: { subtotal: 699, shippingCharge: 0, couponDiscount: 0, tax: 126, total: 825 },
  tracking: { courier: 'Delhivery', trackingNumber: 'DL1', trackingUrl: 'https://t.example/DL1' },
  statusHistory: [{ status: 'placed', message: 'Order placed', timestamp: new Date('2026-11-01') }],
  razorpayPaymentId: 'pay_SECRET', notes: 'internal note', cancelReason: 'internal reason',
  ...over,
});

beforeEach(() => { db.orders = [guestOrder()]; db.users = []; db.updates = { orders: [], txns: [] }; db.lastFind = undefined; });

// ───────── tracking: who can see what ─────────
test('track: right order number + the guest phone works (any phone format)', async () => {
  for (const contact of ['9123456789', '+91 91234 56789', '091234-56789']) {
    const r = await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact });
    assert.equal(r.err, null, contact);
    assert.equal(r.body.data.order.orderNumber, 'ORD-12345678-123');
  }
});

test('track: right order number + the guest email works (case and spaces ignored)', async () => {
  const r = await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: '  ASHA@Example.com ' });
  assert.equal(r.err, null);
});

test('track: the delivery phone from checkout also works', async () => {
  db.orders = [guestOrder({ guestContact: { name: 'A', email: '', phone: '9000000001' }, shippingAddress: { phone: '9123456789', city: 'X' } })];
  const r = await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: '9123456789' });
  assert.equal(r.err, null);
});

test('track: wrong contact and unknown order number give the SAME 404 (nothing leaks about which one was wrong)', async () => {
  const wrongContact = await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: '9999999999' });
  const wrongNumber = await run(trackOrder, { orderNumber: 'ORD-00000000-000', contact: '9123456789' });
  assert.equal(wrongContact.err.statusCode, 404);
  assert.equal(wrongNumber.err.statusCode, 404);
  assert.equal(wrongContact.err.message, wrongNumber.err.message);
});

test('track: an unusable contact (too short, no digits) is refused, not matched against an empty field', async () => {
  db.orders = [guestOrder({ guestContact: { name: 'A', email: '', phone: '' }, shippingAddress: {} })];
  for (const contact of ['', '12345', 'abc', '@']) {
    const r = await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact });
    assert.equal(r.err?.statusCode, 404, `contact "${contact}"`);
  }
});

test('track: only safe fields are returned — no street address, name, email, phone, payment ids or notes', async () => {
  const r = await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: '9123456789' });
  const json = JSON.stringify(r.body);
  for (const secret of ['12 Secret Lane', 'Asha Guest', 'asha@example.com', '9123456789', 'pay_SECRET', 'internal note', 'internal reason', 'p-secret', 'guestContact']) {
    assert.ok(!json.includes(secret), `leaked: ${secret}`);
  }
  const o = r.body.data.order;
  assert.deepEqual(o.shippingTo, { city: 'Bhubaneswar', state: 'Odisha', pincode: '751007' });
  assert.equal(o.orderStatus, 'shipped');
  assert.equal(o.tracking.courier, 'Delhivery');
  assert.equal(o.items[0].name, 'Watch');
  assert.equal(o.pricing.total, 825);
});

test('track: a registered customer\'s order is found by their real email or verified phone, not by their placeholder email', async () => {
  db.orders = [guestOrder({ userId: 'u1', guestContact: undefined, shippingAddress: { phone: '9000000001', city: 'X' } })];
  db.users = [{ email: 'k@example.com', phone: '9876500000', isPhoneVerified: true }];
  assert.equal((await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: 'k@example.com' })).err, null);
  assert.equal((await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: '9876500000' })).err, null);

  db.users = [{ email: 'phone_9876500000@luxora.local', phone: '9876500000', isPhoneVerified: false }];
  assert.equal((await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: 'phone_9876500000@luxora.local' })).err.statusCode, 404);
  assert.equal((await run(trackOrder, { orderNumber: 'ORD-12345678-123', contact: '9876500000' })).err.statusCode, 404, 'unverified account phone proves nothing');
});

test('normalizeContact: email vs phone detection', () => {
  assert.deepEqual(normalizeContact('A@B.com'), { email: 'a@b.com' });
  assert.deepEqual(normalizeContact('+91 98765-43210'), { phone: '9876543210' });
  assert.deepEqual(normalizeContact('123'), {});
  assert.deepEqual(normalizeContact(undefined), {});
});

test('track validator: order number must look like ORD-########-###; contact is required', () => {
  assert.equal(trackOrderSchema.validate({ orderNumber: 'ord-12345678-123', contact: '9123456789' }).error, undefined);
  assert.ok(trackOrderSchema.validate({ orderNumber: 'ORD-123', contact: '9123456789' }).error);
  assert.ok(trackOrderSchema.validate({ orderNumber: 'ORD-12345678-123' }).error);
  assert.ok(trackOrderSchema.validate({ orderNumber: 'ORD-12345678-123', contact: '9123456789', extra: 1 }).error);
});

// ───────── claiming guest orders ─────────
test('claim: a VERIFIED email and a VERIFIED phone pull in matching guest orders and their transactions', async () => {
  const n = await claimGuestOrders({ _id: 'u1', email: 'Asha@Example.com', isVerified: true, phone: '9123456789', isPhoneVerified: true });
  assert.equal(n, 1);
  assert.deepEqual(db.updates.orders[0].filter, { _id: { $in: ['o1'] }, userId: null });
  assert.deepEqual(db.updates.orders[0].update, { $set: { userId: 'u1' } });
  assert.deepEqual(db.updates.txns[0].filter, { order: { $in: ['o1'] }, user: null });
  assert.deepEqual(db.lastFind.$or, [{ 'guestContact.email': 'asha@example.com' }, { 'guestContact.phone': '9123456789' }]);
});

test('claim: an UNVERIFIED email or phone claims nothing (anyone can type anyone\'s email into the guest form)', async () => {
  assert.equal(await claimGuestOrders({ _id: 'u1', email: 'asha@example.com', isVerified: false, phone: '9123456789', isPhoneVerified: false }), 0);
  assert.equal(db.lastFind, undefined, 'no database lookup at all');
  assert.equal(db.updates.orders.length, 0);
});

test('claim: a placeholder email of a phone-only account is never used to match', async () => {
  await claimGuestOrders({ _id: 'u1', email: 'phone_9123456789@luxora.local', isVerified: true, phone: '9123456789', isPhoneVerified: true });
  assert.deepEqual(db.lastFind.$or, [{ 'guestContact.phone': '9123456789' }]);
});

test('claim: only the matching verified channel is used (verified email, unverified phone)', async () => {
  await claimGuestOrders({ _id: 'u1', email: 'asha@example.com', isVerified: true, phone: '9123456789', isPhoneVerified: false });
  assert.deepEqual(db.lastFind.$or, [{ 'guestContact.email': 'asha@example.com' }]);
});

test('claim: orders of other people and already-owned orders are left alone; nothing found = no writes', async () => {
  db.orders = [guestOrder({ userId: 'someone-else' }), guestOrder({ _id: 'o2', orderNumber: 'ORD-1-1', guestContact: { email: 'other@example.com', phone: '9000000099' } })];
  const n = await claimGuestOrders({ _id: 'u1', email: 'asha@example.com', isVerified: true, phone: '9123456789', isPhoneVerified: true });
  assert.equal(n, 0);
  assert.equal(db.updates.orders.length, 0);
  assert.equal(db.updates.txns.length, 0);
});

test('claim: no user / no id -> nothing happens', async () => {
  assert.equal(await claimGuestOrders(null), 0);
  assert.equal(await claimGuestOrders({}), 0);
});

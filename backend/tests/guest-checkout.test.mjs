import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ─────────────────────────────────────────────────────────────
// Round 5 / Group 5 — guest checkout.
// In-memory fakes (real MongoDB transactions need a replica set), so these tests check OUR logic:
// who can order, COD phone proof, coupon limits for guests, payment verify ownership.
// ─────────────────────────────────────────────────────────────
process.env.COD_ENABLED = 'true';
process.env.RAZORPAY_ENABLED = 'true';
process.env.STRIPE_ENABLED = 'true';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.OTP_SECRET = 'test-otp-secret';
delete process.env.LOYALTY_ENABLED;

const db = {
  products: new Map(), carts: [], orders: new Map(), coupons: new Map(), transactions: [], users: [], addresses: [],
  settings: {},
};
const sent = { notifications: [], confirmations: [], otp: [] };

const thenable = (value) => {
  const t = { populate: () => t, session: () => t, then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return t;
};
const same = (a, b) => String(a) === String(b);

const Cart = {
  findOne: (filter) => thenable(db.carts.find((c) => Object.entries(filter).every(([k, v]) => same(c[k], v))) || null),
  findOneAndUpdate: async (filter, update) => {
    const c = db.carts.find((x) => Object.entries(filter).every(([k, v]) => same(x[k], v)));
    if (c) Object.assign(c, update);
  },
};
const Product = {
  findOneAndUpdate: async (filter, update) => {
    const p = db.products.get(filter._id);
    if (!p || p.stock < filter.stock.$gte) return null;
    p.stock += update.$inc.stock; p.totalSold += update.$inc.totalSold;
    return p;
  },
  findByIdAndUpdate: async () => {},
};
const ProductVariant = { findOneAndUpdate: async () => null };
const Order = {
  create: async ([doc]) => {
    const order = { _id: `o${db.orders.size + 1}`, orderNumber: `ORD-T${db.orders.size + 1}`, createdAt: new Date(), ...doc };
    db.orders.set(order._id, order);
    return [order];
  },
  findById: async (id) => db.orders.get(String(id)) || null,
};
const Coupon = {
  findOne: (q) => thenable(db.coupons.get(q.code) || null),
  findByIdAndUpdate: async (id, update) => {
    const c = [...db.coupons.values()].find((x) => x._id === id);
    c.usedCount += update.$inc.usedCount;
    c.usedBy.push(update.$push.usedBy);
  },
};
const Address = {
  findOne: async ({ _id, userId }) => db.addresses.find((a) => a._id === _id && a.userId === userId) || null,
};
const Transaction = {
  create: async (t) => { db.transactions.push(t); return t; },
  findOne: async ({ gatewayOrderId }) => db.transactions.find((t) => t.gatewayOrderId === gatewayOrderId) || null,
  findOneAndUpdate: async () => {},
};
const Notification = { create: async (n) => { sent.notifications.push(n); } };
const Settings = { getSingleton: async () => db.settings };
const User = {
  find: ({ $or }) => {
    const rows = db.users.filter((u) => $or.some((c) => Object.entries(c).every(([k, v]) => u[k] === v)));
    const chain = { select: () => chain, limit: () => chain, lean: async () => rows };
    return chain;
  },
  findById: () => ({ select: () => ({ lean: async () => null }) }),
};

mock.module('mongoose', {
  defaultExport: { startSession: async () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} }) },
});
mock.module('../src/models/index.js', {
  namedExports: { Order, Cart, Product, ProductVariant, Address, Coupon, Transaction, LoyaltyPoints: {}, Notification, Settings, User },
});
mock.module('../src/utils/logger.js', { defaultExport: { info() {}, warn() {}, error() {} } });
mock.module('../src/config/razorpay.js', {
  namedExports: { getRazorpay: () => ({ orders: { create: async ({ amount }) => ({ id: 'rzp_order_1', amount, currency: 'INR' }) } }) },
});
mock.module('../src/config/stripe.js', { namedExports: { getStripe: () => ({}) } });
mock.module('../src/utils/email.js', { namedExports: { sendEmail: async () => ({}) } });
mock.module('../src/services/orderNotifications.service.js', { namedExports: { notifyOrderEventInBackground: () => {} } });
mock.module('../src/services/orderLifecycle.service.js', {
  namedExports: {
    cancelOrderAndRestore: async () => ({ cancelled: false }),
    markOrderPaid: async (id) => ({ status: 'paid', order: db.orders.get(id) }),
    flagLatePayment: async () => {},
    sendConfirmationEmailFor: (o) => { sent.confirmations.push(o.orderNumber); },
  },
});
mock.module('../src/services/otp.service.js', {
  namedExports: {
    issueOtp: async (args) => { sent.otp.push(['issue', args]); },
    consumeOtp: async ({ otp, subject }) => {
      if (otp !== '123456') throw Object.assign(new Error('Invalid OTP'), { statusCode: 400 });
      return { target: db.otpTarget || subject };
    },
  },
});

const { createOrder, verifyRazorpayPayment } = await import('../src/controllers/order.controller.js');
const { applyCoupon, removeCoupon, validateCoupon } = await import('../src/controllers/coupon.controller.js');
const { sendGuestCheckoutOtp, verifyGuestCheckoutOtp } = await import('../src/controllers/guestCheckout.controller.js');
const { signGuestPhoneToken, isValidGuestPhoneToken } = await import('../src/utils/guestCheckoutToken.js');
const { getOrderRecipient } = await import('../src/utils/orderRecipient.js');
const { countCouponUses } = await import('../src/utils/couponUsage.js');
const { createOrderSchema, guestSendOtpSchema, guestVerifyOtpSchema } = await import('../src/validators/order.validator.js');
const jwt = (await import('jsonwebtoken')).default;

// Controller ko seedha chalao (asyncHandler errors next(err) se deta hai)
const run = async (handler, { user = null, body = {}, headers = {} } = {}) => {
  const out = { code: 200, body: null, err: null };
  const res = {
    status(c) { out.code = c; return this; },
    json(b) { out.body = b; return this; },
  };
  await handler({ user, body, headers, params: {}, query: {} }, res, (err) => { out.err = err; });
  return out;
};

const guestBody = (over = {}) => ({
  paymentMethod: 'cod',
  guest: {
    name: 'Asha Guest', email: 'asha@example.com', phone: '9876543210', phoneToken: signGuestPhoneToken('9876543210'),
    address: { addressLine1: '12 MG Road', city: 'Bhubaneswar', state: 'Odisha', pincode: '751001' },
  },
  ...over,
});
const withGuest = (over) => { const b = guestBody(); Object.assign(b.guest, over); return b; };

const fillCart = (key = { sessionId: 'sess1' }) => {
  db.carts = db.carts.filter((c) => !Object.entries(key).every(([k, v]) => same(c[k], v)));
  db.carts.push({ ...key, couponCode: null, couponDiscount: 0, save: async () => {}, items: [{ product: db.products.get('p1'), variant: null, price: 1000, quantity: 2 }] });
};
const mkCoupon = (over = {}) => ({
  _id: 'c1', code: 'SAVE10', type: 'percentage', value: 10, maxDiscount: 0, minOrderAmount: 0,
  usageLimit: 0, usedCount: 0, usagePerUser: 1, usedBy: [], ...over,
});

beforeEach(() => {
  db.products = new Map([['p1', { _id: 'p1', name: 'Watch', isActive: true, stock: 10, totalSold: 0, images: ['w.jpg'] }]]);
  db.carts = []; db.orders = new Map(); db.coupons = new Map(); db.transactions = []; db.users = [];
  db.addresses = [{ _id: 'a1', userId: 'u1', fullName: 'Ravi', phone: '9000000001', addressLine1: '5 Park St', addressLine2: '', city: 'Cuttack', state: 'Odisha', pincode: '753001', country: 'India' }];
  db.settings = { maintenanceMode: false, allowGuestCheckout: true, freeDeliveryAbove: 499, deliveryFee: 49, taxRate: 18 };
  db.otpTarget = null;
  sent.notifications.length = 0; sent.confirmations.length = 0; sent.otp.length = 0;
  fillCart();
});

// ───────── who may order ─────────
test('no login and no guest details -> 401 (so an expired token makes the app refresh and retry)', async () => {
  const r = await run(createOrder, { body: { paymentMethod: 'cod', addressId: 'a1' }, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 401);
  assert.equal(db.orders.size, 0);
});

test('logged-in user without an addressId -> 400', async () => {
  const r = await run(createOrder, { user: { _id: 'u1', isPhoneVerified: true }, body: { paymentMethod: 'cod' } });
  assert.equal(r.err.statusCode, 400);
});

test('guest with no cart session at all -> 400 and nothing is created', async () => {
  const r = await run(createOrder, { body: guestBody(), headers: {} });
  assert.equal(r.err.statusCode, 400);
  assert.equal(db.orders.size, 0);
});

test('guest checkout switched off in settings -> 403, but a logged-in user can still order', async () => {
  db.settings.allowGuestCheckout = false;
  const g = await run(createOrder, { body: guestBody(), headers: { 'x-session-id': 'sess1' } });
  assert.equal(g.err.statusCode, 403);
  assert.equal(db.orders.size, 0);

  fillCart({ userId: 'u1' });
  const u = await run(createOrder, { user: { _id: 'u1', isPhoneVerified: true }, body: { paymentMethod: 'cod', addressId: 'a1' } });
  assert.equal(u.err, null);
  assert.equal(u.code, 201);
});

test('maintenance mode blocks guest orders too', async () => {
  db.settings.maintenanceMode = true;
  const r = await run(createOrder, { body: guestBody(), headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 503);
});

// ───────── guest COD ─────────
test('guest COD without a verified-phone token -> 403 PHONE_NOT_VERIFIED, no order, stock untouched', async () => {
  const body = withGuest({ phoneToken: undefined });
  const r = await run(createOrder, { body, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 403);
  assert.deepEqual(r.err.errors, ['PHONE_NOT_VERIFIED']);
  assert.equal(db.orders.size, 0);
  assert.equal(db.products.get('p1').stock, 10);
});

test('guest COD with a token issued for a DIFFERENT phone is refused', async () => {
  const body = withGuest({ phoneToken: signGuestPhoneToken('9000000009') });
  const r = await run(createOrder, { body, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 403);
});

test('guest COD with a forged / wrong-secret token is refused', async () => {
  const forged = jwt.sign({ phone: '9876543210', purpose: 'guest_checkout' }, 'not-the-secret', { expiresIn: '30m' });
  const r = await run(createOrder, { body: withGuest({ phoneToken: forged }), headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 403);
});

test('guest COD with a valid token: order has no userId, keeps the guest contact + address snapshot, stock goes down, cart is cleared', async () => {
  const r = await run(createOrder, { body: guestBody(), headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err, null);
  assert.equal(r.code, 201);
  const order = [...db.orders.values()][0];
  assert.equal(order.userId, null);
  assert.deepEqual(order.guestContact, { name: 'Asha Guest', email: 'asha@example.com', phone: '9876543210', phoneVerified: true });
  assert.equal(order.shippingAddress.addressLine1, '12 MG Road');
  assert.equal(order.shippingAddress.country, 'India');
  assert.equal(order.pricing.total, 2360); // 2000 + 0 shipping + 18% tax
  assert.equal(db.products.get('p1').stock, 8);
  assert.equal(db.carts[0].items.length, 0);
  assert.equal(sent.notifications.length, 0, 'a guest has no account, so no in-app notification');
  assert.deepEqual(sent.confirmations, [order.orderNumber]);
  assert.equal(db.transactions.length, 0);
});

test('guest cart is found by the session id only: another session cannot order this cart', async () => {
  const r = await run(createOrder, { body: guestBody(), headers: { 'x-session-id': 'someone-else' } });
  assert.equal(r.err.statusCode, 400);
  assert.equal(db.orders.size, 0);
  assert.equal(db.carts[0].items.length, 1);
});

// ───────── guest online payment ─────────
test('guest Razorpay: no OTP needed, order + gateway order created, Transaction has no user', async () => {
  const r = await run(createOrder, { body: { ...withGuest({ phoneToken: undefined }), paymentMethod: 'razorpay' }, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err, null);
  assert.equal(r.code, 201);
  assert.equal(r.body.data.razorpayOrder.id, 'rzp_order_1');
  assert.equal(r.body.data.razorpayOrder.amount, 236000);
  assert.equal(db.transactions[0].user, null);
  assert.equal([...db.orders.values()][0].guestContact.phoneVerified, false);
  assert.equal(sent.confirmations.length, 0, 'online order email goes out after payment, not now');
});

test('guest Stripe is refused with a clear message (Stripe needs an account)', async () => {
  const r = await run(createOrder, { body: { ...guestBody(), paymentMethod: 'stripe' }, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 400);
  assert.match(r.err.message, /log in/i);
  assert.equal(db.orders.size, 0);
});

// ───────── guest coupons ─────────
test('guest coupon: used once per phone — same phone is refused the 2nd time, another phone is fine', async () => {
  db.coupons.set('SAVE10', mkCoupon());
  const first = await run(createOrder, { body: guestBody({ couponCode: 'SAVE10' }), headers: { 'x-session-id': 'sess1' } });
  assert.equal(first.err, null);
  assert.equal([...db.orders.values()][0].pricing.couponDiscount, 200);
  assert.deepEqual(db.coupons.get('SAVE10').usedBy, [{ guestKey: '9876543210' }]);
  assert.equal(db.coupons.get('SAVE10').usedCount, 1);

  fillCart();
  const again = await run(createOrder, { body: guestBody({ couponCode: 'SAVE10' }), headers: { 'x-session-id': 'sess1' } });
  assert.equal(again.err.statusCode, 400);
  assert.match(again.err.message, /already used/i);
  assert.equal(db.orders.size, 1);

  fillCart();
  const other = await run(createOrder, {
    body: { ...withGuest({ phone: '9123456780', phoneToken: signGuestPhoneToken('9123456780') }), couponCode: 'SAVE10' },
    headers: { 'x-session-id': 'sess1' },
  });
  assert.equal(other.err, null);
  assert.equal(db.coupons.get('SAVE10').usedCount, 2);
});

test('guest cannot reuse a coupon that a registered account with the same phone already used', async () => {
  db.users = [{ _id: 'u7', phone: '9876543210', email: 'someone@else.com' }];
  db.coupons.set('SAVE10', mkCoupon({ usedBy: [{ userId: 'u7' }], usedCount: 1 }));
  const r = await run(createOrder, { body: guestBody({ couponCode: 'SAVE10' }), headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 400);
  assert.match(r.err.message, /already used/i);
});

test('guest cannot reuse a coupon that a registered account with the same email already used', async () => {
  db.users = [{ _id: 'u7', phone: '9000000000', email: 'asha@example.com' }];
  db.coupons.set('SAVE10', mkCoupon({ usedBy: [{ userId: 'u7' }], usedCount: 1 }));
  const r = await run(createOrder, { body: guestBody({ couponCode: 'SAVE10' }), headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err.statusCode, 400);
});

test('a coupon already used by a guest does not crash the logged-in path (usedBy entries without userId are handled)', async () => {
  db.coupons.set('SAVE10', mkCoupon({ usedBy: [{ guestKey: '9876543210' }], usedCount: 1, usagePerUser: 2 }));
  fillCart({ userId: 'u1' });
  const r = await run(createOrder, { user: { _id: 'u1', isPhoneVerified: true }, body: { paymentMethod: 'cod', addressId: 'a1', couponCode: 'SAVE10' } });
  assert.equal(r.err, null);
  assert.deepEqual(db.coupons.get('SAVE10').usedBy.at(-1), { userId: 'u1' });
});

test('countCouponUses: counts by user id, guest phone and linked accounts; ignores everyone else', () => {
  const c = { usedBy: [{ userId: 'u1' }, { guestKey: '9876543210' }, { userId: 'u2' }, { guestKey: '9000000000' }] };
  assert.equal(countCouponUses(c, { userId: 'u1' }), 1);
  assert.equal(countCouponUses(c, { guestKey: '9876543210' }), 1);
  assert.equal(countCouponUses(c, { guestKey: '9876543210', relatedUserIds: ['u2'] }), 2);
  assert.equal(countCouponUses(c, {}), 0);
});

// ───────── logged-in path unchanged ─────────
test('logged-in order still works: userId set, saved address used, notification created, cart found by userId', async () => {
  fillCart({ userId: 'u1' });
  const r = await run(createOrder, { user: { _id: 'u1', isPhoneVerified: true }, body: { paymentMethod: 'cod', addressId: 'a1' }, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err, null);
  const order = [...db.orders.values()][0];
  assert.equal(order.userId, 'u1');
  assert.equal(order.guestContact, undefined);
  assert.equal(order.shippingAddress.city, 'Cuttack');
  assert.equal(sent.notifications.length, 1);
  assert.equal(db.carts.find((c) => c.userId === 'u1').items.length, 0);
  assert.equal(db.carts.find((c) => c.sessionId === 'sess1').items.length, 1, 'the separate guest cart is not touched');
});

test('logged-in COD with an unverified phone is still refused', async () => {
  fillCart({ userId: 'u1' });
  const r = await run(createOrder, { user: { _id: 'u1', isPhoneVerified: false }, body: { paymentMethod: 'cod', addressId: 'a1' } });
  assert.equal(r.err.statusCode, 403);
  assert.deepEqual(r.err.errors, ['PHONE_NOT_VERIFIED']);
});

test('logged-in user cannot use someone else\'s saved address', async () => {
  fillCart({ userId: 'u2' });
  const r = await run(createOrder, { user: { _id: 'u2', isPhoneVerified: true }, body: { paymentMethod: 'cod', addressId: 'a1' } });
  assert.equal(r.err.statusCode, 404);
});

// ───────── coupon endpoints for guests ─────────
test('apply-coupon works for a guest cart (found by session) and stores the discount on that cart', async () => {
  db.coupons.set('SAVE10', mkCoupon());
  const r = await run(applyCoupon, { body: { code: 'save10' }, headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err, null);
  assert.equal(r.body.data.discount, 200);
  assert.equal(db.carts[0].couponCode, 'SAVE10');
});

test('apply-coupon without login and without a session -> 400 (not a crash)', async () => {
  db.coupons.set('SAVE10', mkCoupon());
  const r = await run(applyCoupon, { body: { code: 'SAVE10' }, headers: {} });
  assert.equal(r.err.statusCode, 400);
});

test('apply-coupon for a logged-in user who already used it is still refused; a guest-used entry does not crash it', async () => {
  db.coupons.set('SAVE10', mkCoupon({ usedBy: [{ guestKey: '9000000000' }, { userId: 'u1' }], usedCount: 2 }));
  fillCart({ userId: 'u1' });
  const r = await run(applyCoupon, { user: { _id: 'u1' }, body: { code: 'SAVE10' } });
  assert.equal(r.err.statusCode, 400);
  assert.match(r.err.message, /already used/i);
});

test('remove-coupon clears the guest cart coupon; validate works without login', async () => {
  db.coupons.set('SAVE10', mkCoupon());
  db.carts[0].couponCode = 'SAVE10'; db.carts[0].couponDiscount = 200;
  const r = await run(removeCoupon, { headers: { 'x-session-id': 'sess1' } });
  assert.equal(r.err, null);
  assert.equal(db.carts[0].couponCode, null);
  const v = await run(validateCoupon, { body: { code: 'SAVE10' } });
  assert.equal(v.err, null);
  assert.equal(v.body.data.code, 'SAVE10');
});

// ───────── razorpay verify: who may confirm which order ─────────
const sign = (orderId, paymentId) => crypto.createHmac('sha256', 'test_secret').update(`${orderId}|${paymentId}`).digest('hex');
const verifyBody = () => ({ razorpay_order_id: 'rzp_order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sign('rzp_order_1', 'pay_1') });

test('verify payment: a guest order is confirmed with no login (the signed payment is the proof)', async () => {
  db.orders.set('o1', { _id: 'o1', orderNumber: 'ORD-T1', userId: null });
  db.transactions.push({ order: 'o1', gatewayOrderId: 'rzp_order_1', gateway: 'razorpay' });
  const r = await run(verifyRazorpayPayment, { body: verifyBody() });
  assert.equal(r.err, null);
  assert.equal(r.code, 200);
});

test('verify payment: a registered user\'s order with NO token -> 401 (expired token: app refreshes and retries, payment is not lost)', async () => {
  db.orders.set('o1', { _id: 'o1', orderNumber: 'ORD-T1', userId: 'u1' });
  db.transactions.push({ order: 'o1', gatewayOrderId: 'rzp_order_1', gateway: 'razorpay' });
  const r = await run(verifyRazorpayPayment, { body: verifyBody() });
  assert.equal(r.err.statusCode, 401);
});

test('verify payment: another logged-in user cannot confirm this order (404)', async () => {
  db.orders.set('o1', { _id: 'o1', orderNumber: 'ORD-T1', userId: 'u1' });
  db.transactions.push({ order: 'o1', gatewayOrderId: 'rzp_order_1', gateway: 'razorpay' });
  const r = await run(verifyRazorpayPayment, { user: { _id: 'u2' }, body: verifyBody() });
  assert.equal(r.err.statusCode, 404);
});

test('verify payment: the owner can confirm their own order', async () => {
  db.orders.set('o1', { _id: 'o1', orderNumber: 'ORD-T1', userId: 'u1' });
  db.transactions.push({ order: 'o1', gatewayOrderId: 'rzp_order_1', gateway: 'razorpay' });
  const r = await run(verifyRazorpayPayment, { user: { _id: 'u1' }, body: verifyBody() });
  assert.equal(r.err, null);
});

// ───────── phone OTP for guest COD ─────────
test('guest OTP: send issues a guest_checkout OTP for that phone; it is refused when guest checkout is off', async () => {
  const r = await run(sendGuestCheckoutOtp, { body: { phone: '9876543210' } });
  assert.equal(r.err, null);
  assert.deepEqual(sent.otp, [['issue', { purpose: 'guest_checkout', subject: '9876543210', target: '9876543210' }]]);

  db.settings.allowGuestCheckout = false;
  const off = await run(sendGuestCheckoutOtp, { body: { phone: '9876543210' } });
  assert.equal(off.err.statusCode, 403);
});

test('guest OTP: a correct code returns a token that is valid for THAT phone only; a wrong code returns none', async () => {
  const ok = await run(verifyGuestCheckoutOtp, { body: { phone: '9876543210', otp: '123456' } });
  assert.equal(ok.err, null);
  const token = ok.body.data.phoneToken;
  assert.equal(isValidGuestPhoneToken(token, '9876543210'), true);
  assert.equal(isValidGuestPhoneToken(token, '9999999999'), false);

  const bad = await run(verifyGuestCheckoutOtp, { body: { phone: '9876543210', otp: '000000' } });
  assert.ok(bad.err);
  assert.equal(bad.body, null);
});

test('guest OTP: an OTP that was issued for another number cannot verify this one', async () => {
  db.otpTarget = '9000000000';
  const r = await run(verifyGuestCheckoutOtp, { body: { phone: '9876543210', otp: '123456' } });
  assert.equal(r.err.statusCode, 400);
});

test('phone token: expired, empty and tampered tokens are all rejected', () => {
  const expired = jwt.sign({ phone: '9876543210', purpose: 'guest_checkout' }, `${process.env.OTP_SECRET}:guest-phone`, { expiresIn: -10 });
  assert.equal(isValidGuestPhoneToken(expired, '9876543210'), false);
  assert.equal(isValidGuestPhoneToken('', '9876543210'), false);
  assert.equal(isValidGuestPhoneToken(undefined, '9876543210'), false);
  assert.equal(isValidGuestPhoneToken(`${signGuestPhoneToken('9876543210')}x`, '9876543210'), false);
  // ek normal login access token (alag secret + alag purpose) guest proof nahi ban sakta
  const access = jwt.sign({ userId: 'u1', role: 'user' }, 'some-jwt-secret');
  assert.equal(isValidGuestPhoneToken(access, '9876543210'), false);
});

// ───────── order recipient ─────────
test('getOrderRecipient: guest order gives the guest contact; no email is invented', async () => {
  const g = await getOrderRecipient({ userId: null, guestContact: { name: 'Asha', email: '', phone: '9876543210', phoneVerified: true } });
  assert.deepEqual(g, { name: 'Asha', email: '', phone: '9876543210', isPhoneVerified: true, isGuest: true });
  const fallback = await getOrderRecipient({ userId: null, shippingAddress: { fullName: 'Ravi', phone: '9000000001' } });
  assert.equal(fallback.name, 'Ravi');
  assert.equal(fallback.phone, '9000000001');
});

// ───────── request validation ─────────
const okGuest = () => ({ paymentMethod: 'cod', guest: guestBody().guest });

test('validator: a complete guest order passes; a logged-in order (addressId only) still passes', () => {
  assert.equal(createOrderSchema.validate(okGuest()).error, undefined);
  assert.equal(createOrderSchema.validate({ paymentMethod: 'razorpay', addressId: 'a1' }).error, undefined);
});

test('validator: bad phone, bad pincode, missing address and unknown guest fields are rejected', () => {
  const bad = (mut) => { const b = okGuest(); mut(b); return createOrderSchema.validate(b).error; };
  assert.ok(bad((b) => { b.guest.phone = '12345'; }));
  assert.ok(bad((b) => { b.guest.phone = '5876543210'; }));
  assert.ok(bad((b) => { b.guest.address.pincode = '75100'; }));
  assert.ok(bad((b) => { b.guest.address.pincode = '051001'; }));
  assert.ok(bad((b) => { delete b.guest.address; }));
  assert.ok(bad((b) => { b.guest.name = 'A'; }));
  assert.ok(bad((b) => { b.guest.email = 'not-an-email'; }));
  assert.ok(bad((b) => { b.guest.isAdmin = true; }));
});

test('validator: guest email is optional (empty is fine); OTP schemas accept only a 10-digit mobile and a 6-digit code', () => {
  const b = okGuest(); b.guest.email = '';
  assert.equal(createOrderSchema.validate(b).error, undefined);
  assert.equal(guestSendOtpSchema.validate({ phone: '9876543210' }).error, undefined);
  assert.ok(guestSendOtpSchema.validate({ phone: '98765' }).error);
  assert.equal(guestVerifyOtpSchema.validate({ phone: '9876543210', otp: '123456' }).error, undefined);
  assert.ok(guestVerifyOtpSchema.validate({ phone: '9876543210', otp: '12' }).error);
});

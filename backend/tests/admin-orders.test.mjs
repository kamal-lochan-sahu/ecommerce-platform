import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Admin order controllers (status rules, tracking, COD delivery, refund, list search)
// against tiny in-memory fakes - checks OUR logic, no MongoDB needed.
const db = { orders: new Map() };
const sent = { notifications: [], cancelCalls: [], lastFind: null, events: [] };
const clone = (o) => (o ? structuredClone(o) : o);

const applyUpdate = (doc, update) => {
  if (update.$set) for (const [k, v] of Object.entries(update.$set)) {
    if (k.includes('.')) { const [a, b] = k.split('.'); doc[a] = { ...(doc[a] || {}), [b]: v }; } else doc[k] = v;
  }
  if (update.$push) for (const [f, item] of Object.entries(update.$push)) doc[f].push({ ...item, timestamp: new Date() });
};
const matchesRefundDue = (o) => ['cancelled', 'returned'].includes(o.orderStatus) && o.paymentStatus === 'paid';

const Order = {
  findById: async (id) => clone(db.orders.get(String(id))),
  findByIdAndUpdate: async (id, update) => { const d = db.orders.get(String(id)); applyUpdate(d, update); return clone(d); },
  findOneAndUpdate: async (filter) => {
    const d = db.orders.get(String(filter._id));
    if (!d || !matchesRefundDue(d)) return null; // same condition as REFUND_DUE_FILTER
    return { __apply: (u) => applyUpdate(d, u), d };
  },
  find: (filter) => {
    sent.lastFind = filter;
    const rows = [...db.orders.values()];
    const chain = { populate: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => rows.map(clone) };
    return chain;
  },
  countDocuments: async () => db.orders.size,
  aggregate: async () => [{ _id: 'placed', count: 2 }, { _id: 'delivered', count: 1 }],
};
// refund path: findOneAndUpdate must also apply the update, so wrap it
const realFOAU = Order.findOneAndUpdate;
Order.findOneAndUpdate = async (filter, update) => {
  const r = await realFOAU(filter);
  if (!r) return null;
  applyUpdate(r.d, update);
  return clone(r.d);
};
const Notification = { create: async (n) => { sent.notifications.push(n); } };
const User = { find: () => { const c = { select: () => c, limit: () => c, lean: async () => [{ _id: 'u9' }] }; return c; } };

mock.module('../src/models/index.js', {
  namedExports: { Order, Notification, User, Cart: {}, Product: {}, ProductVariant: {}, Address: {}, Coupon: {}, Transaction: {}, LoyaltyPoints: {}, Settings: {} },
});
mock.module('../src/services/orderLifecycle.service.js', {
  namedExports: {
    cancelOrderAndRestore: async (id, opts) => { sent.cancelCalls.push({ id, opts }); return { cancelled: true, order: { _id: id, orderStatus: 'cancelled' } }; },
    markOrderPaid: async () => {}, flagLatePayment: async () => {}, sendConfirmationEmailFor: async () => {},
  },
});
mock.module('../src/services/orderNotifications.service.js', {
  namedExports: { notifyOrderEventInBackground: (event, order, extra) => { sent.events.push({ event, orderId: order?._id, extra }); } },
});
mock.module('../src/utils/logger.js', { defaultExport: { info() {}, warn() {}, error() {} } });
mock.module('../src/config/razorpay.js', { namedExports: { getRazorpay: () => ({}) } });
mock.module('../src/config/stripe.js', { namedExports: { getStripe: () => ({}) } });
mock.module('../src/utils/email.js', { namedExports: { sendEmail: async () => ({}) } });

const { updateOrderStatus, markOrderRefunded, getAllOrders } = await import('../src/controllers/order.controller.js');

const mkOrder = (over = {}) => ({
  _id: 'o1', orderNumber: 'ORD-1', userId: 'u1', orderStatus: 'placed', paymentStatus: 'pending', paymentMethod: 'cod',
  pricing: { total: 1180 }, statusHistory: [], tracking: {}, items: [{ quantity: 2, price: 590, name: 'Kurta' }], ...over,
});
const call = async (handler, { body = {}, params = { id: 'o1' }, query = {} } = {}) => {
  const out = { status: 200, json: null, error: null };
  const res = { json: (j) => { out.json = j; return res; }, status: (c) => { out.status = c; return res; } };
  await handler({ body, params, query }, res, (e) => { out.error = e; });
  return out;
};

beforeEach(() => {
  db.orders.clear(); sent.notifications.length = 0; sent.cancelCalls.length = 0; sent.lastFind = null; sent.events.length = 0;
  db.orders.set('o1', mkOrder());
});

test('COD order: placed -> shipped saves tracking, history and tells the customer the tracking number', async () => {
  const r = await call(updateOrderStatus, { body: { status: 'shipped', courier: 'Delhivery', trackingNumber: 'DL123', trackingUrl: 'https://t.example/DL123' } });
  assert.equal(r.error, null);
  const o = db.orders.get('o1');
  assert.equal(o.orderStatus, 'shipped');
  assert.deepEqual(o.tracking, { trackingNumber: 'DL123', courier: 'Delhivery', trackingUrl: 'https://t.example/DL123' });
  assert.equal(o.statusHistory.at(-1).status, 'shipped');
  assert.match(sent.notifications[0].message, /Delhivery DL123/);
});

test('tracking update does not wipe previously saved tracking fields', async () => {
  db.orders.get('o1').orderStatus = 'shipped';
  db.orders.get('o1').tracking = { courier: 'Delhivery', trackingNumber: 'DL123' };
  await call(updateOrderStatus, { body: { status: 'delivered' } });
  assert.deepEqual(db.orders.get('o1').tracking, { courier: 'Delhivery', trackingNumber: 'DL123' });
});

test('COD delivered: marks payment as paid (cash collected) and stores deliveredAt', async () => {
  db.orders.get('o1').orderStatus = 'shipped';
  await call(updateOrderStatus, { body: { status: 'delivered' } });
  const o = db.orders.get('o1');
  assert.equal(o.paymentStatus, 'paid');
  assert.ok(o.deliveredAt instanceof Date);
});

test('online order already paid: delivered keeps it paid', async () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'shipped' }));
  const r = await call(updateOrderStatus, { body: { status: 'delivered' } });
  assert.equal(r.error, null);
  assert.equal(db.orders.get('o1').paymentStatus, 'paid');
});

test('going backwards (delivered -> processing) is refused with 400 and nothing changes', async () => {
  db.orders.get('o1').orderStatus = 'delivered';
  const r = await call(updateOrderStatus, { body: { status: 'processing' } });
  assert.equal(r.error.statusCode, 400);
  assert.equal(db.orders.get('o1').orderStatus, 'delivered');
  assert.equal(sent.notifications.length, 0);
});

test('UNPAID online order cannot be shipped (only cancelled)', async () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay', paymentStatus: 'pending' }));
  const r = await call(updateOrderStatus, { body: { status: 'shipped' } });
  assert.equal(r.error.statusCode, 400);
  assert.match(r.error.message, /Payment for this online order is not received/);
  assert.equal(db.orders.get('o1').orderStatus, 'placed');
});

test('cancel goes through the shared stock-restoring helper', async () => {
  const r = await call(updateOrderStatus, { body: { status: 'cancelled', message: 'Out of stock' } });
  assert.equal(r.error, null);
  assert.equal(sent.cancelCalls.length, 1);
  assert.deepEqual(sent.cancelCalls[0].opts.allowedFrom, ['placed', 'confirmed', 'processing', 'shipped']);
});

test('cancelled order cannot be changed any more', async () => {
  db.orders.get('o1').orderStatus = 'cancelled';
  const r = await call(updateOrderStatus, { body: { status: 'confirmed' } });
  assert.equal(r.error.statusCode, 400);
  assert.match(r.error.message, /cancelled/);
});

test('refund: cancelled + paid online order -> refunded, history entry with reference, customer notified', async () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'cancelled' }));
  const r = await call(markOrderRefunded, { body: { reference: 'rfnd_123' } });
  assert.equal(r.error, null);
  const o = db.orders.get('o1');
  assert.equal(o.paymentStatus, 'refunded');
  assert.match(o.statusHistory.at(-1).message, /rfnd_123/);
  assert.equal(sent.notifications[0].title, 'Refund processed');
});

test('refund: marking twice or on an order with no refund due is refused', async () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'cancelled' }));
  await call(markOrderRefunded);
  const again = await call(markOrderRefunded);
  assert.equal(again.error.statusCode, 400);

  db.orders.set('o1', mkOrder({ orderStatus: 'cancelled', paymentStatus: 'pending' })); // never paid (COD)
  const none = await call(markOrderRefunded);
  assert.equal(none.error.statusCode, 400);
  assert.match(none.error.message, /No refund is due/);
});

test('order list: adds allowedNext + refundDue per order and status counts for the filter chips', async () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'cancelled' }));
  db.orders.set('o2', mkOrder({ _id: 'o2', orderNumber: 'ORD-2', orderStatus: 'processing' }));
  const r = await call(getAllOrders);
  const byNo = Object.fromEntries(r.json.data.orders.map((o) => [o.orderNumber, o]));
  assert.equal(byNo['ORD-1'].refundDue, true);
  assert.deepEqual(byNo['ORD-1'].allowedNext, []);
  assert.equal(byNo['ORD-2'].refundDue, false);
  assert.deepEqual(byNo['ORD-2'].allowedNext, ['shipped', 'delivered', 'cancelled']);
  assert.deepEqual(r.json.data.statusCounts, { placed: 2, delivered: 1 });
  assert.equal(typeof r.json.data.pagination.total, 'number');
});

test('order list search: matches order number OR the customer, and user text cannot break the regex', async () => {
  await call(getAllOrders, { query: { search: 'a.b(' } });
  const f = sent.lastFind;
  assert.equal(f.$or.length, 2);
  assert.ok(f.$or[0].orderNumber instanceof RegExp);
  assert.equal(f.$or[0].orderNumber.source, 'a\\.b\\(');
  assert.deepEqual(f.$or[1].userId.$in, ['u9']);
});

test('email + SMS events: shipped, delivered and returned are sent; confirmed/processing stay in-app only', async () => {
  await call(updateOrderStatus, { body: { status: 'confirmed' } });
  await call(updateOrderStatus, { body: { status: 'processing' } });
  assert.deepEqual(sent.events, []);

  await call(updateOrderStatus, { body: { status: 'shipped', courier: 'Delhivery', trackingNumber: 'DL1' } });
  await call(updateOrderStatus, { body: { status: 'delivered' } });
  await call(updateOrderStatus, { body: { status: 'returned' } });
  assert.deepEqual(sent.events.map((e) => e.event), ['shipped', 'delivered', 'returned']);
});

test('refused changes send nothing (no email/SMS for an update that did not happen)', async () => {
  db.orders.get('o1').orderStatus = 'delivered';
  await call(updateOrderStatus, { body: { status: 'processing' } });
  assert.deepEqual(sent.events, []);
});

test('admin cancel sends the cancelled event with the admin reason', async () => {
  await call(updateOrderStatus, { body: { status: 'cancelled', message: 'Item damaged in warehouse' } });
  assert.deepEqual(sent.events, [{ event: 'cancelled', orderId: 'o1', extra: { reason: 'Item damaged in warehouse' } }]);
});

test('marking a refund done sends the refunded event with the reference', async () => {
  db.orders.set('o1', mkOrder({ paymentMethod: 'razorpay', paymentStatus: 'paid', orderStatus: 'cancelled' }));
  await call(markOrderRefunded, { body: { reference: 'rfnd_9' } });
  assert.deepEqual(sent.events.map((e) => [e.event, e.extra.reference]), [['refunded', 'rfnd_9']]);
});

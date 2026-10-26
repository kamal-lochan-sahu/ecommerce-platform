import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Customer email + SMS on order events. Real templates, fake providers/DB.
const out = { mail: [], sms: [] };
let user, settings, mailResult, smsResult;

mock.module('../src/models/index.js', {
  namedExports: {
    User: { findById: () => { const c = { select: () => c, lean: async () => user }; return c; } },
    Settings: { getSingleton: async () => settings },
  },
});
mock.module('../src/services/messaging.service.js', {
  namedExports: {
    sendMail: async (m) => { out.mail.push(m); return mailResult; },
    sendSms: async (m) => { out.sms.push(m); return smsResult; },
  },
});
mock.module('../src/utils/logger.js', { defaultExport: { info() {}, warn() {}, error() {} } });

process.env.FRONTEND_URL = 'https://shop.example.com/';
delete process.env.CLIENT_NAME;
delete process.env.SUPPORT_EMAIL;
delete process.env.SUPPORT_PHONE;
delete process.env.BRAND_COLOR;

const { notifyOrderEvent } = await import('../src/services/orderNotifications.service.js');

const mkOrder = (over = {}) => ({
  _id: 'ord1', orderNumber: 'ORD-77', userId: 'u1', paymentMethod: 'razorpay', paymentStatus: 'paid',
  pricing: { total: 1180 }, tracking: {}, shippingAddress: { phone: '9876543210' }, ...over,
});

beforeEach(() => {
  out.mail.length = 0; out.sms.length = 0;
  user = { name: 'Krishna Das', email: 'k@example.com', phone: '9000000001', isPhoneVerified: true };
  settings = { storeName: 'Sharma Sarees', storeEmail: 'help@sharmasarees.in', storePhone: '+91 98765 00000', storeAddress: 'Pune' };
  mailResult = { success: true }; smsResult = { success: true };
});

test('shipped: email + SMS carry courier, tracking and the CLIENT brand (white-label)', async () => {
  const r = await notifyOrderEvent('shipped', mkOrder({ tracking: { courier: 'Delhivery', trackingNumber: 'DL123', trackingUrl: 'https://track.example/DL123' } }));
  assert.deepEqual([r.email, r.sms], ['sent', 'sent']);
  const mail = out.mail[0];
  assert.equal(mail.to, 'k@example.com');
  assert.match(mail.subject, /Your order ORD-77 has shipped \| Sharma Sarees/);
  assert.match(mail.html, /Delhivery/);
  assert.match(mail.html, /DL123/);
  assert.match(mail.html, /href="https:\/\/track\.example\/DL123"/);
  assert.match(mail.html, /help@sharmasarees\.in/);
  assert.doesNotMatch(mail.html, /myshop|Luxora/i);
  assert.match(out.sms[0].body, /^Sharma Sarees: Order ORD-77 has shipped \(Delhivery DL123\)\./);
  assert.match(out.sms[0].body, /https:\/\/shop\.example\.com\/orders\/ord1/); // no double slash
});

test('COD shipment tells the customer how much cash to keep ready', async () => {
  await notifyOrderEvent('shipped', mkOrder({ paymentMethod: 'cod', paymentStatus: 'pending' }));
  assert.match(out.mail[0].html, /keep ₹1,180 ready/);
  assert.match(out.sms[0].body, /Pay ₹1,180 on delivery/);
});

test('shipped without tracking info still works and links to the order page', async () => {
  await notifyOrderEvent('shipped', mkOrder());
  assert.match(out.mail[0].html, /View order/);
  assert.doesNotMatch(out.mail[0].html, /Tracking number/);
});

test('delivered: thanks, no broken /review /return /invoice links', async () => {
  await notifyOrderEvent('delivered', mkOrder());
  assert.match(out.mail[0].html, /has been delivered/);
  assert.doesNotMatch(out.mail[0].html, /\/review|\/return|\/invoice/);
  assert.match(out.sms[0].body, /delivered/);
});

test('cancelled: paid order promises a refund, unpaid order says nothing was charged; admin reason is included', async () => {
  await notifyOrderEvent('cancelled', mkOrder(), { reason: 'Out of stock' });
  assert.match(out.mail[0].html, /Out of stock/);
  assert.match(out.mail[0].html, /refund ₹1,180/);
  assert.match(out.sms[0].body, /refund of ₹1,180 is being processed/);

  out.mail.length = 0; out.sms.length = 0;
  await notifyOrderEvent('cancelled', mkOrder({ paymentMethod: 'cod', paymentStatus: 'pending' }));
  assert.match(out.mail[0].html, /not been charged/);
  assert.doesNotMatch(out.sms[0].body, /refund/i);
});

test('refunded: includes the reference in the email', async () => {
  await notifyOrderEvent('refunded', mkOrder({ paymentStatus: 'refunded' }), { reference: 'rfnd_abc' });
  assert.match(out.mail[0].html, /rfnd_abc/);
  assert.match(out.sms[0].body, /Refund of ₹1,180/);
});

test('returned: email only, no SMS', async () => {
  const r = await notifyOrderEvent('returned', mkOrder());
  assert.equal(r.email, 'sent');
  assert.equal(r.sms, 'skipped');
  assert.equal(out.sms.length, 0);
});

test('unknown event sends nothing', async () => {
  const r = await notifyOrderEvent('confirmed', mkOrder());
  assert.deepEqual([r.email, r.sms], ['skipped', 'skipped']);
  assert.equal(out.mail.length + out.sms.length, 0);
});

test('SMS goes to the verified account number; otherwise to the delivery number from checkout', async () => {
  await notifyOrderEvent('delivered', mkOrder());
  assert.equal(out.sms[0].to, '9000000001');

  out.sms.length = 0;
  user.isPhoneVerified = false;
  await notifyOrderEvent('delivered', mkOrder());
  assert.equal(out.sms[0].to, '9876543210');

  out.sms.length = 0;
  await notifyOrderEvent('delivered', mkOrder({ shippingAddress: { phone: '12345' } })); // invalid number
  assert.equal(out.sms.length, 0);
});

test('phone-only account (placeholder email): no email is attempted, SMS still goes', async () => {
  user.email = 'phone_9000000001@luxora.local';
  const r = await notifyOrderEvent('delivered', mkOrder());
  assert.equal(out.mail.length, 0);
  assert.equal(r.email, 'skipped');
  assert.equal(r.sms, 'sent');
});

test('HTML injection: courier / reason / name are escaped in the email', async () => {
  user.name = '<b>Evil</b> One';
  await notifyOrderEvent('shipped', mkOrder({ tracking: { courier: '<script>alert(1)</script>', trackingNumber: 'X' } }));
  assert.doesNotMatch(out.mail[0].html, /<script>/);
  assert.match(out.mail[0].html, /&lt;script&gt;/);
  assert.doesNotMatch(out.mail[0].html, /<b>Evil/);
});

test('a non-http tracking link is never used as a button', async () => {
  await notifyOrderEvent('shipped', mkOrder({ tracking: { trackingUrl: 'javascript:alert(1)' } }));
  assert.doesNotMatch(out.mail[0].html, /javascript:/);
});

test('provider failures never throw and are reported honestly', async () => {
  mailResult = { success: false, error: 'SMTP down' }; smsResult = { success: false, error: 'twilio boom' };
  const r = await notifyOrderEvent('delivered', mkOrder());
  assert.deepEqual([r.email, r.sms], ['failed', 'failed']);
});

test('settings lookup failing falls back to env brand and never fakes a support address', async () => {
  settings = null; // getSingleton returns nothing
  process.env.CLIENT_NAME = 'Env Brand';
  await notifyOrderEvent('delivered', mkOrder());
  assert.match(out.mail[0].subject, /Env Brand/);
  assert.match(out.mail[0].html, /Just reply to this email/);
  assert.doesNotMatch(out.mail[0].html, /myshop/i);
  delete process.env.CLIENT_NAME;
});

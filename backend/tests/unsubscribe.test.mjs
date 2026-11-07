import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';

// Round 5 Group 7B (backend): marketing-email unsubscribe.
//  - signed token (no expiry), public POST /api/users/unsubscribe, User.marketingEmails flag
//  - profile toggle (updateProfile) can turn it back on/off
//  - abandoned-cart email carries a working token link, the store's brand name, the cart's own price

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'https://shop.example.com/';

const url = (p) => new URL(p, import.meta.url).href;
const updates = []; // User.updateOne calls
const profileUpdates = []; // User.findByIdAndUpdate calls
const sentMail = [];

const User = {
  updateOne: async (filter, upd) => { updates.push({ filter, upd }); return { matchedCount: 1 }; },
  findByIdAndUpdate: async (id, data) => { profileUpdates.push({ id, data }); return { _id: id, ...data }; },
};
const Settings = { getSingleton: async () => ({ storeName: 'Acme Store' }) };

mock.module(url('../src/models/index.js'), { namedExports: { User, Otp: {}, Settings } });
mock.module(url('../src/services/guestOrderClaim.service.js'), { namedExports: { claimGuestOrdersInBackground: () => {} } });
mock.module(url('../src/services/messaging.service.js'), {
  namedExports: {
    sendSms: async () => ({ success: true }),
    sendMail: async (m) => { sentMail.push(m); return { success: true, messageId: 'm1' }; },
  },
});

const { signUnsubscribeToken, verifyUnsubscribeToken } = await import('../src/utils/unsubscribeToken.js');
const { unsubscribeMarketing, updateProfile } = await import('../src/controllers/user.controller.js');
const { sendAbandonedCartEmail } = await import('../src/services/email.service.js');
const { unsubscribeSchema, updateProfileSchema } = await import('../src/validators/user.validator.js');

const run = async (handler, { user = null, body = {} } = {}) => {
  const out = { body: null, err: null };
  const res = { status() { return res; }, json(b) { out.body = b; return res; } };
  await handler({ user, body }, res, (e) => { out.err = e; });
  return out;
};

beforeEach(() => { updates.length = 0; profileUpdates.length = 0; sentMail.length = 0; });

// ── token ────────────────────────────────────────────────────

test('token round-trips to the user id and never expires', () => {
  const token = signUnsubscribeToken('64b000000000000000000001');
  assert.equal(verifyUnsubscribeToken(token), '64b000000000000000000001');
  assert.equal(jwt.decode(token).exp, undefined); // purani email ka link bhi chalna chahiye
});

test('tampered, foreign and empty tokens are rejected', () => {
  const token = signUnsubscribeToken('u1');
  assert.equal(verifyUnsubscribeToken(token.slice(0, -2) + 'xx'), null);
  assert.equal(verifyUnsubscribeToken(jwt.sign({ uid: 'u1', purpose: 'unsubscribe_marketing' }, 'other-secret')), null);
  // login/access token us user ka unsubscribe ke liye use nahi ho sakta
  assert.equal(verifyUnsubscribeToken(jwt.sign({ id: 'u1' }, process.env.JWT_SECRET)), null);
  assert.equal(verifyUnsubscribeToken(''), null);
  assert.equal(verifyUnsubscribeToken(undefined), null);
});

// ── endpoint ─────────────────────────────────────────────────

test('unsubscribe with a valid token turns marketingEmails off (idempotent, no login)', async () => {
  const token = signUnsubscribeToken('u1');
  for (let i = 0; i < 2; i++) {
    const r = await run(unsubscribeMarketing, { body: { token } });
    assert.equal(r.err, null);
    assert.match(r.body.message, /unsubscribed/i);
  }
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0], { filter: { _id: 'u1' }, upd: { $set: { marketingEmails: false } } });
});

test('unsubscribe with a bad token is a 400 and touches nothing', async () => {
  const r = await run(unsubscribeMarketing, { body: { token: 'garbage' } });
  assert.equal(r.err.statusCode, 400);
  assert.equal(updates.length, 0);
});

test('route is public: registered before router.use(protect)', () => {
  const src = fs.readFileSync(new URL('../src/routes/user.routes.js', import.meta.url), 'utf8');
  const pub = src.indexOf("router.post('/unsubscribe'");
  const guard = src.indexOf('router.use(protect)');
  assert.ok(pub > -1 && guard > -1 && pub < guard, 'unsubscribe must come before protect');
  assert.match(src, /unsubscribeLimiter/);
});

test('validators: token required; profile accepts marketingEmails boolean only', () => {
  assert.ok(unsubscribeSchema.validate({}).error);
  assert.equal(unsubscribeSchema.validate({ token: 'abc' }).error, undefined);
  assert.equal(updateProfileSchema.validate({ marketingEmails: false }).error, undefined);
  assert.ok(updateProfileSchema.validate({ marketingEmails: 'maybe' }).error);
});

// ── profile toggle ───────────────────────────────────────────

test('profile toggle can turn marketing emails off and back on', async () => {
  const user = { _id: 'u1', phone: undefined };
  await run(updateProfile, { user, body: { marketingEmails: false } });
  await run(updateProfile, { user, body: { marketingEmails: true } });
  assert.deepEqual(profileUpdates.map((p) => p.data.marketingEmails), [false, true]);
});

test('profile save without the flag does not change marketingEmails', async () => {
  await run(updateProfile, { user: { _id: 'u1' }, body: { name: 'Asha' } });
  assert.equal('marketingEmails' in profileUpdates[0].data, false);
});

// ── abandoned-cart email ─────────────────────────────────────

test('abandoned-cart email: token link, brand name, cart price (not product.price)', async () => {
  const cart = { items: [{ quantity: 2, price: 1200, product: { name: 'Linen Shirt', price: 999, images: [] } }] };
  const r = await sendAbandonedCartEmail({ _id: 'u7', name: 'Asha', email: 'a@example.com' }, cart);
  assert.equal(r.success, true);

  const html = sentMail[0].html;
  const link = html.match(/href="(https:\/\/shop\.example\.com\/unsubscribe\?token=[^"]+)"/);
  assert.ok(link, 'unsubscribe link with token missing');
  const token = decodeURIComponent(new URL(link[1]).searchParams.get('token'));
  assert.equal(verifyUnsubscribeToken(token), 'u7');

  assert.match(html, /Acme Store/);
  assert.doesNotMatch(html, /MyShop/);
  assert.match(html, /2,?400/); // 2 x 1200 cart total
  assert.doesNotMatch(html, /1,?998/); // 2 x 999 (product.price) nahi
});

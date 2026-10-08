// Run with:  npm test      (needs Node >= 22.3; uses an in-memory fake database, no MongoDB needed)
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'x'; process.env.REFRESH_TOKEN_SECRET = 'y';

// ---------- tiny in-memory Mongo-ish fakes ----------
const matches = (doc, q) => Object.entries(q).every(([k, cond]) => {
  if (k === '$or') return cond.some((sub) => matches(doc, sub));
  if (cond && typeof cond === 'object' && '$ne' in cond) return String(doc[k]) !== String(cond.$ne);
  return String(doc[k]) === String(cond);
});
const chain = (value) => { const p = Promise.resolve(value); p.select = () => p; return p; };

const users = []; const otps = []; let nid = 1;
const sentSms = []; const sentMail = []; let smsOk = true; let mailOk = true;

class FakeUser {
  constructor(o) { Object.assign(this, { _id: 'u' + nid++, isVerified: false, isActive: true, isPhoneVerified: false }, o); }
  toJSON() { const o = { ...this }; delete o._pw; delete o.password; delete o.otp; return o; }
  async comparePassword(p) { return p === this._pw; }
  async save() {
    for (const u of users) {
      if (u === this) continue;
      if (u.email === this.email) { const e = new Error('dup email'); e.code = 11000; throw e; }
      if (this.isPhoneVerified && u.isPhoneVerified && u.phone === this.phone) { const e = new Error('dup phone'); e.code = 11000; throw e; }
    }
    if (!users.includes(this)) users.push(this);
    return this;
  }
  static async create(o) { const u = new FakeUser(o); await u.save(); return u; }
  static findOne(q) { return chain(users.find((u) => matches(u, q)) ?? null); }
  static findById(id) { return chain(users.find((u) => u._id === id) ?? null); }
  static async findByIdAndUpdate(id, upd) { const u = users.find((x) => x._id === id); if (u) Object.assign(u, upd.$set ?? upd); return u; }
}
const applyUpdate = (doc, upd) => {
  if (upd.$set) Object.assign(doc, upd.$set);
  if (upd.$inc) for (const [k, v] of Object.entries(upd.$inc)) doc[k] = (doc[k] ?? 0) + v;
};
class FakeOtp {
  static async findOne(q) { return otps.find((d) => matches(d, q)) ?? null; }
  static async findOneAndUpdate(q, upd, opts = {}) {
    let d = otps.find((x) => matches(x, q));
    if (!d && opts.upsert) { d = { _id: 'o' + nid++, ...q, attempts: 0 }; otps.push(d); }
    if (d) applyUpdate(d, upd);
    return d ?? null;
  }
  static async deleteOne(q) { const i = otps.findIndex((d) => matches(d, q)); if (i >= 0) otps.splice(i, 1); }
  static async findOneAndDelete(q) { const i = otps.findIndex((d) => matches(d, q)); return i >= 0 ? otps.splice(i, 1)[0] : null; }
}
const url = (p) => new URL(p, import.meta.url).href;
mock.module(url('../src/models/index.js'), { namedExports: { User: FakeUser, Otp: FakeOtp } });
mock.module(url('../src/services/messaging.service.js'), {
  namedExports: {
    sendSms: async ({ to, body }) => { sentSms.push({ to, body }); return { success: smsOk }; },
    sendMail: async ({ to, subject, html }) => { sentMail.push({ to, subject, html }); return { success: mailOk }; },
  },
});
mock.module(url('../src/utils/cloudinary.js'), { namedExports: { uploadToCloudinary: async () => '', deleteFromCloudinary: async () => {} } });

const { issueOtp, consumeOtp } = await import('../src/services/otp.service.js');
const auth = await import('../src/controllers/auth.controller.js');
const usr = await import('../src/controllers/user.controller.js');

const call = async (handler, req) => {
  const out = { body: null, status: 200, cookies: {} };
  const res = { status(c) { out.status = c; return res; }, cookie(n, v) { out.cookies[n] = v; return res; }, clearCookie() { return res; }, json(b) { out.body = b; return res; } };
  let err; await handler(req, res, (e) => { err = e; });
  return { ...out, err };
};
const flush = () => new Promise((r) => setTimeout(r, 5));
beforeEach(() => { users.length = 0; otps.length = 0; sentSms.length = 0; sentMail.length = 0; smsOk = true; mailOk = true; });
const P = '9000000020';
const codeIn = (s) => s.match(/\b\d{6}\b/)[0];
const lastSmsCode = () => codeIn(sentSms.at(-1).body);
const lastMailCode = () => codeIn(sentMail.at(-1).html);
const age = (ms) => { for (const d of otps) d.lastSentAt = new Date(Date.now() - ms); };
const wrong = (good) => (good === '000000' ? '111111' : '000000');

// ============================ OTP service ============================
test('send: only a HASH is stored, no user is created, a 6-digit SMS goes out', async () => {
  await issueOtp({ purpose: 'login', subject: P, target: P });
  assert.equal(users.length, 0, 'requesting an OTP must not create an account');
  assert.match(lastSmsCode(), /^\d{6}$/);
  assert.equal(JSON.stringify(otps).includes(lastSmsCode()), false, 'plain code is stored nowhere');
});

test('send: 30 s cooldown, then allowed again', async () => {
  await issueOtp({ purpose: 'login', subject: P, target: P });
  await assert.rejects(() => issueOtp({ purpose: 'login', subject: P, target: P }), (e) => e.statusCode === 429 && /wait \d+ seconds/.test(e.message));
  age(31000);
  await issueOtp({ purpose: 'login', subject: P, target: P });
  assert.equal(sentSms.length, 2);
});

test('send: max 5 per hour per target (anti SMS/email bombing)', async () => {
  for (let i = 0; i < 5; i++) { await issueOtp({ purpose: 'login', subject: P, target: P }); age(31000); }
  await assert.rejects(() => issueOtp({ purpose: 'login', subject: P, target: P }), (e) => e.statusCode === 429 && /hour/.test(e.message));
  assert.equal(sentSms.length, 5);
});

test('verify: 4 wrong guesses ok, the 5th wrong one destroys the code', async () => {
  await issueOtp({ purpose: 'login', subject: P, target: P });
  const good = lastSmsCode();
  for (let i = 0; i < 4; i++) await assert.rejects(() => consumeOtp({ purpose: 'login', subject: P, otp: wrong(good) }), /Invalid OTP/);
  await assert.rejects(() => consumeOtp({ purpose: 'login', subject: P, otp: wrong(good) }), /Too many incorrect attempts/);
  await assert.rejects(() => consumeOtp({ purpose: 'login', subject: P, otp: good }), /expired or not requested/);
});

test('verify: right code on the 5th try still works; expired code rejected; single use', async () => {
  await issueOtp({ purpose: 'login', subject: P, target: P });
  const good = lastSmsCode();
  for (let i = 0; i < 4; i++) await assert.rejects(() => consumeOtp({ purpose: 'login', subject: P, otp: wrong(good) }));
  assert.equal((await consumeOtp({ purpose: 'login', subject: P, otp: good })).target, P);
  await assert.rejects(() => consumeOtp({ purpose: 'login', subject: P, otp: good }), /expired or not requested/, 'replay fails');
  age(31000); await issueOtp({ purpose: 'login', subject: P, target: P });
  otps[0].expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(() => consumeOtp({ purpose: 'login', subject: P, otp: lastSmsCode() }), /expired/);
});

test('delivery failure: honest 503 and no cooldown penalty (SMS and email)', async () => {
  smsOk = false;
  await assert.rejects(() => issueOtp({ purpose: 'login', subject: P, target: P }), (e) => e.statusCode === 503);
  assert.equal(otps.length, 0);
  mailOk = false;
  await assert.rejects(() => issueOtp({ purpose: 'email_add', subject: 'u1', target: 'a@x.com' }), (e) => e.statusCode === 503 && /email/.test(e.message));
  const r = await issueOtp({ purpose: 'email_verify', subject: 'u1', target: 'a@x.com', throwOnFailure: false });
  assert.equal(r.delivered, false);
});

test('codes are bound to their purpose: an email_add code cannot be used as email_verify', async () => {
  await issueOtp({ purpose: 'email_add', subject: 'u1', target: 'a@x.com' });
  await assert.rejects(() => consumeOtp({ purpose: 'email_verify', subject: 'u1', otp: lastMailCode() }), /expired or not requested/);
});

// ============================ phone OTP login ============================
test('login OTP, brand-new number -> creates a verified phone-only account AFTER the OTP', async () => {
  await call(auth.sendOtp, { body: { phone: P } });
  assert.equal(users.length, 0);
  const r = await call(auth.verifyOtp, { body: { phone: P, otp: lastSmsCode() } });
  assert.equal(r.err, undefined); assert.equal(users.length, 1);
  const u = users[0];
  assert.equal(u.isPhoneVerified, true); assert.equal(u.isVerified, true);
  assert.equal(u.email, 'phone_9000000020@luxora.local'); assert.equal(u.name, 'User0020');
  assert.ok(r.cookies.refreshToken && r.body.data.accessToken);
});

test('login OTP, existing verified owner -> same account; email-verified flag untouched', async () => {
  const owner = await FakeUser.create({ email: 'a@x.com', phone: P, isPhoneVerified: true, isVerified: false, name: 'Owner' });
  await call(auth.sendOtp, { body: { phone: P } });
  const r = await call(auth.verifyOtp, { body: { phone: P, otp: lastSmsCode() } });
  assert.equal(r.body.data.user._id, owner._id); assert.equal(users.length, 1);
  assert.equal(owner.isVerified, false);
});

test('ATTACK: squatter lists the victim\'s number unverified -> victim still lands in their OWN account', async () => {
  const squatter = await FakeUser.create({ email: 'evil@x.com', phone: P, isPhoneVerified: false, name: 'Evil' });
  await call(auth.sendOtp, { body: { phone: P } });
  const r = await call(auth.verifyOtp, { body: { phone: P, otp: lastSmsCode() } });
  assert.notEqual(r.body.data.user._id, squatter._id);
  assert.equal(r.body.data.user.isPhoneVerified, true); assert.equal(squatter.isPhoneVerified, false);
});

test('login OTP: deactivated owner refused; race on creation falls back to the winner', async () => {
  await FakeUser.create({ email: 'a@x.com', phone: P, isPhoneVerified: true, isActive: false });
  await call(auth.sendOtp, { body: { phone: P } });
  assert.equal((await call(auth.verifyOtp, { body: { phone: P, otp: lastSmsCode() } })).err.statusCode, 403);

  users.length = 0; otps.length = 0;
  await call(auth.sendOtp, { body: { phone: P } });
  const code = lastSmsCode(); const realCreate = FakeUser.create;
  FakeUser.create = async (o) => { await realCreate.call(FakeUser, { ...o, email: 'other@x.com' }); const e = new Error('dup'); e.code = 11000; throw e; };
  const r = await call(auth.verifyOtp, { body: { phone: P, otp: code } });
  FakeUser.create = realCreate;
  assert.equal(r.err, undefined); assert.equal(users.length, 1);
});

// ============================ password login / register ============================
test('phone+password login matches only the VERIFIED owner', async () => {
  await FakeUser.create({ email: 'evil@x.com', phone: P, isPhoneVerified: false, password: 'h', _pw: 'evilpass' });
  const victim = await FakeUser.create({ email: 'v@x.com', phone: P, isPhoneVerified: true, password: 'h', _pw: 'victimpass' });
  let r = await call(auth.login, { body: { phone: P, password: 'victimpass' } });
  assert.equal(r.body.data.user._id, victim._id);
  r = await call(auth.login, { body: { phone: P, password: 'evilpass' } });
  assert.equal(r.err.statusCode, 401);
});

test('register: unverified duplicate phone allowed, verified duplicate refused; welcome + verification code sent', async () => {
  await FakeUser.create({ email: 'a@x.com', phone: '9111111111', isPhoneVerified: false });
  let r = await call(auth.register, { body: { name: 'N', email: 'New1@X.com', phone: '9111111111', password: 'secret1' } });
  assert.equal(r.err, undefined); await flush();
  const u = users.find((x) => x.email === 'new1@x.com');
  assert.ok(u, 'email stored lowercase'); assert.equal(u.otp, undefined, 'no plain code stored on the user any more');
  assert.equal(otps.length, 1); assert.equal(sentMail.filter((m) => m.to === 'new1@x.com').length, 2, 'welcome + verification');
  await FakeUser.create({ email: 'b@x.com', phone: '9222222222', isPhoneVerified: true });
  r = await call(auth.register, { body: { name: 'N', email: 'new2@x.com', phone: '9222222222', password: 'secret1' } });
  assert.equal(r.err.message, 'Phone number already registered');
});

test('register still succeeds when the verification email cannot be delivered', async () => {
  mailOk = false;
  const r = await call(auth.register, { body: { name: 'N', email: 'x@x.com', password: 'secret1' } });
  await flush();
  assert.equal(r.err, undefined); assert.ok(r.body.data.accessToken);
});

// ============================ email verification ============================
test('verify-email: wrong code, right code, replay; stored hashed on its own record', async () => {
  const u = await FakeUser.create({ email: 'a@x.com', name: 'A' });
  await call(auth.resendVerification, { user: { _id: u._id } });
  const good = lastMailCode();
  let r = await call(auth.verifyEmail, { user: { _id: u._id }, body: { otp: wrong(good) } });
  assert.equal(r.err.message, 'Invalid OTP'); assert.equal(u.isVerified, false);
  r = await call(auth.verifyEmail, { user: { _id: u._id }, body: { otp: good } });
  assert.equal(r.err, undefined); assert.equal(u.isVerified, true);
  r = await call(auth.verifyEmail, { user: { _id: u._id }, body: { otp: good } });
  assert.match(r.body.message, /already verified/);
});

test('verify-email: brute force is capped per account (5 tries), not just per IP', async () => {
  const u = await FakeUser.create({ email: 'a@x.com' });
  await call(auth.resendVerification, { user: { _id: u._id } });
  const good = lastMailCode();
  let r;
  for (let i = 0; i < 5; i++) r = await call(auth.verifyEmail, { user: { _id: u._id }, body: { otp: wrong(good) } });
  assert.match(r.err.message, /Too many incorrect attempts/);
  r = await call(auth.verifyEmail, { user: { _id: u._id }, body: { otp: good } });
  assert.match(r.err.message, /expired or not requested/);
});

test('resend-verification: cooldown, honest failure, and it NEVER touches the password-reset token', async () => {
  const u = await FakeUser.create({ email: 'a@x.com', otp: { code: 'RESET_HASH', expiresAt: new Date(Date.now() + 99999) } });
  let r = await call(auth.resendVerification, { user: { _id: u._id } });
  assert.equal(r.err, undefined);
  assert.equal(u.otp.code, 'RESET_HASH', 'pending password reset must survive');
  r = await call(auth.resendVerification, { user: { _id: u._id } });
  assert.equal(r.err.statusCode, 429);
  age(31000); mailOk = false;
  r = await call(auth.resendVerification, { user: { _id: u._id } });
  assert.equal(r.err.statusCode, 503);
});

// ============================ add real email (phone-only user) ============================
const phoneUser = () => FakeUser.create({ name: 'User0020', phone: P, isPhoneVerified: true, isVerified: true, email: 'phone_9000000020@luxora.local' });

test('add email: request -> wrong code -> right code; email only changes after the code', async () => {
  const u = await phoneUser();
  let r = await call(usr.requestEmailAdd, { user: { _id: u._id }, body: { email: '  Kamal@Example.COM ' } });
  assert.equal(r.err, undefined); assert.equal(sentMail.at(-1).to, 'kamal@example.com');
  assert.equal(u.email, 'phone_9000000020@luxora.local');
  const good = lastMailCode();
  r = await call(usr.verifyEmailAdd, { user: { _id: u._id }, body: { otp: wrong(good) } });
  assert.equal(r.err.message, 'Invalid OTP');
  r = await call(usr.verifyEmailAdd, { user: { _id: u._id }, body: { otp: good } });
  assert.equal(u.email, 'kamal@example.com'); assert.equal(r.body.data.user.hasRealEmail, true);
});

test('add email: rejected when taken, placeholder, or account already has a real email; race at confirm time', async () => {
  const u = await phoneUser();
  await FakeUser.create({ email: 'taken@x.com', name: 'T' });
  assert.equal((await call(usr.requestEmailAdd, { user: { _id: u._id }, body: { email: 'TAKEN@x.com' } })).err.message, 'Email already registered');
  assert.equal((await call(usr.requestEmailAdd, { user: { _id: u._id }, body: { email: 'phone_9@luxora.local' } })).err.statusCode, 400);
  const real = await FakeUser.create({ email: 'real@x.com', name: 'R' });
  assert.match((await call(usr.requestEmailAdd, { user: { _id: real._id }, body: { email: 'n@x.com' } })).err.message, /already has an email/);
  await call(usr.requestEmailAdd, { user: { _id: u._id }, body: { email: 'late@x.com' } });
  const code = lastMailCode(); await FakeUser.create({ email: 'late@x.com', name: 'Snatched' });
  assert.equal((await call(usr.verifyEmailAdd, { user: { _id: u._id }, body: { otp: code } })).err.message, 'Email already registered');
});

// ============================ phone verify / change from Profile ============================
test('profile: add + verify a phone number (not verified until the OTP is confirmed)', async () => {
  const u = await FakeUser.create({ email: 'a@x.com', name: 'A' });
  await call(usr.requestPhoneVerification, { user: { _id: u._id }, body: { phone: P } });
  assert.equal(u.isPhoneVerified, false);
  const good = lastSmsCode();
  assert.equal((await call(usr.verifyPhone, { user: { _id: u._id }, body: { otp: wrong(good) } })).err.message, 'Invalid OTP');
  const r = await call(usr.verifyPhone, { user: { _id: u._id }, body: { otp: good } });
  assert.equal(u.phone, P); assert.equal(u.isPhoneVerified, true); assert.equal(r.body.data.user.isPhoneVerified, true);
});

test('profile: number verified by someone else is refused (up front and at confirm time)', async () => {
  const owner = await FakeUser.create({ email: 'o@x.com', phone: P, isPhoneVerified: true });
  const u = await FakeUser.create({ email: 'a@x.com' });
  assert.match((await call(usr.requestPhoneVerification, { user: { _id: u._id }, body: { phone: P } })).err.message, /already linked/);
  owner.isPhoneVerified = false;
  await call(usr.requestPhoneVerification, { user: { _id: u._id }, body: { phone: P } });
  owner.isPhoneVerified = true;
  assert.match((await call(usr.verifyPhone, { user: { _id: u._id }, body: { otp: lastSmsCode() } })).err.message, /already linked/);
  assert.equal(u.isPhoneVerified, false);
});

test('profile: changing to a new number replaces the old one only after confirmation; OTPs are per-user', async () => {
  const u = await FakeUser.create({ email: 'a@x.com', phone: P, isPhoneVerified: true });
  assert.match((await call(usr.requestPhoneVerification, { user: { _id: u._id }, body: { phone: P } })).err.message, /already verified/);
  await call(usr.requestPhoneVerification, { user: { _id: u._id }, body: { phone: '9333333333' } });
  assert.equal(u.phone, P);
  const other = await FakeUser.create({ email: 'b@x.com' });
  assert.match((await call(usr.verifyPhone, { user: { _id: other._id }, body: { otp: lastSmsCode() } })).err.message, /expired or not requested/);
  await call(usr.verifyPhone, { user: { _id: u._id }, body: { otp: lastSmsCode() } });
  assert.equal(u.phone, '9333333333');
});

test('profile: a plain form save can no longer change the phone number', async () => {
  const u = await FakeUser.create({ email: 'a@x.com', phone: P, isPhoneVerified: true, name: 'A' });
  const r = await call(usr.updateProfile, { user: { _id: u._id, phone: P }, body: { phone: '9444444444' } });
  assert.equal(r.err.statusCode, 400); assert.match(r.err.message, /OTP/);
});

// ============================ delete account frees the identifiers ============================
test('delete account: email + phone are released so the person can sign up again; sessions revoked', async () => {
  const u = await FakeUser.create({ email: 'gone@x.com', phone: P, isPhoneVerified: true, name: 'Gone', refreshToken: 'rt' });
  const r = await call(usr.deleteAccount, { user: { _id: u._id }, body: {} });
  assert.equal(r.err, undefined);
  assert.equal(u.isActive, false); assert.notEqual(u.email, 'gone@x.com'); assert.match(u.email, /@deleted\.invalid$/);
  assert.equal(u.phone, undefined); assert.equal(u.isPhoneVerified, false); assert.equal(u.refreshToken, undefined);
  const again = await call(auth.register, { body: { name: 'Gone', email: 'gone@x.com', phone: P, password: 'secret1' } });
  assert.equal(again.err, undefined, 'same email can register again');
});

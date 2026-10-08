import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const created = []; const mailSent = []; const smsSent = [];
let failMail = false, failSms = false;
mock.module('nodemailer', { defaultExport: { createTransport: (cfg) => { created.push(cfg); return { sendMail: async (m) => { mailSent.push(m); if (failMail) throw new Error('SMTP down'); return { messageId: 'mid-1' }; } }; } } });
mock.module('twilio', { defaultExport: () => ({ messages: { create: async (m) => { smsSent.push(m); if (failSms) throw new Error('twilio boom'); return { sid: 'SM123' }; } } }) });

const M = await import('../src/services/messaging.service.js');
const ENV_KEYS = ['SMS_PROVIDER','EMAIL_PROVIDER','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_PHONE_NUMBER','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_SECURE','GMAIL_USER','GMAIL_PASS','GMAIL_APP_PASSWORD','EMAIL_FROM','EMAIL_FROM_NAME','CLIENT_NAME','NODE_ENV'];
beforeEach(() => { for (const k of ENV_KEYS) delete process.env[k]; created.length = 0; mailSent.length = 0; smsSent.length = 0; failMail = false; failSms = false; });

test('SMS provider selection', () => {
  assert.equal(M.getSmsProvider(), 'none', 'nothing configured -> none (never a silent fake)');
  process.env.SMS_PROVIDER = 'console'; assert.equal(M.getSmsProvider(), 'console');
  process.env.SMS_PROVIDER = ' TWILIO '; assert.equal(M.getSmsProvider(), 'twilio');
  process.env.SMS_PROVIDER = 'msg91'; assert.equal(M.getSmsProvider(), 'invalid');
  delete process.env.SMS_PROVIDER; process.env.TWILIO_ACCOUNT_SID = 'AC1'; process.env.TWILIO_AUTH_TOKEN = 't';
  assert.equal(M.getSmsProvider(), 'twilio', 'legacy: Twilio keys alone still work');
});

test('Email provider selection (incl. legacy Gmail + "gmail" name)', () => {
  assert.equal(M.getMailProvider(), 'none');
  process.env.EMAIL_PROVIDER = 'console'; assert.equal(M.getMailProvider(), 'console');
  process.env.EMAIL_PROVIDER = 'smtp'; assert.equal(M.getMailProvider(), 'none', 'smtp chosen but no credentials -> not configured');
  process.env.SMTP_HOST = 'smtp.sendgrid.net'; assert.equal(M.getMailProvider(), 'smtp');
  delete process.env.SMTP_HOST; delete process.env.EMAIL_PROVIDER;
  process.env.GMAIL_USER = 'a@gmail.com'; process.env.GMAIL_PASS = 'pw'; assert.equal(M.getMailProvider(), 'smtp', 'legacy GMAIL_* keeps working');
  process.env.EMAIL_PROVIDER = 'gmail'; assert.equal(M.getMailProvider(), 'smtp', 'legacy provider name');
  process.env.EMAIL_PROVIDER = 'mailgun'; assert.equal(M.getMailProvider(), 'invalid');
});

test('console providers "deliver" and succeed (testing mode)', async () => {
  process.env.SMS_PROVIDER = 'console'; process.env.EMAIL_PROVIDER = 'console';
  assert.deepEqual(await M.sendSms({ to: '9000000020', body: 'x' }), { success: true, provider: 'console' });
  const r = await M.sendMail({ to: 'a@x.com', subject: 's', html: '<b>hi</b>' });
  assert.equal(r.success, true); assert.equal(mailSent.length, 0, 'console never touches SMTP');
});

test('unconfigured / invalid providers fail HONESTLY (no fake success)', async () => {
  let r = await M.sendSms({ to: '9000000020', body: 'x' });
  assert.equal(r.success, false); assert.match(r.error, /not configured/);
  r = await M.sendMail({ to: 'a@x.com', subject: 's', html: 'h' });
  assert.equal(r.success, false); assert.match(r.error, /not configured/);
  process.env.SMS_PROVIDER = 'msg91'; r = await M.sendSms({ to: '9000000020', body: 'x' });
  assert.match(r.error, /Unknown SMS_PROVIDER/);
});

test('placeholder / empty recipients are never emailed', async () => {
  process.env.EMAIL_PROVIDER = 'smtp'; process.env.SMTP_HOST = 'h';
  let r = await M.sendMail({ to: 'phone_9000000020@luxora.local', subject: 's', html: 'h' });
  assert.equal(r.success, false); assert.equal(r.skipped, true); assert.equal(mailSent.length, 0);
  r = await M.sendMail({ to: ['phone_1@luxora.local', 'real@x.com'], subject: 's', html: 'h' });
  assert.equal(r.success, true); assert.equal(mailSent[0].to, 'real@x.com', 'only the real address is used');
  r = await M.sendMail({ to: undefined, subject: 's', html: 'h' }); assert.equal(r.skipped, true);
});

test('SMTP: sends with the right from/to/subject/text and surfaces failure without throwing', async () => {
  process.env.SMTP_HOST = 'smtp.example.com'; process.env.SMTP_PORT = '2525'; process.env.SMTP_USER = 'u'; process.env.SMTP_PASS = 'p';
  process.env.EMAIL_FROM = 'shop@brand.com'; process.env.EMAIL_FROM_NAME = 'Brand';
  let r = await M.sendMail({ to: 'a@x.com', subject: 'Hello', html: '<style>x{}</style><p>Your code <b>123456</b></p>' });
  assert.equal(r.success, true); assert.equal(r.messageId, 'mid-1');
  assert.equal(created.at(-1).host, 'smtp.example.com'); assert.equal(created.at(-1).port, 2525); assert.equal(created.at(-1).family, 4);
  assert.equal(created.at(-1).connectionTimeout, 10000, 'fails fast instead of hanging');
  assert.equal(mailSent[0].from, '"Brand" <shop@brand.com>'); assert.equal(mailSent[0].text, 'Your code 123456');
  failMail = true;
  r = await M.sendMail({ to: 'a@x.com', subject: 'Hello', html: 'h' });
  assert.equal(r.success, false); assert.match(r.error, /SMTP down/);
});

test('SMTP: legacy Gmail settings map to smtp.gmail.com:587', async () => {
  process.env.GMAIL_USER = 'shop@gmail.com'; process.env.GMAIL_PASS = 'apppass'; process.env.CLIENT_NAME = 'Luxora';
  const r = await M.sendMail({ to: 'a@x.com', subject: 's', html: 'h' });
  assert.equal(r.success, true);
  const cfg = created.at(-1);
  assert.equal(cfg.host, 'smtp.gmail.com'); assert.equal(cfg.port, 587); assert.equal(cfg.secure, false); assert.equal(cfg.auth.user, 'shop@gmail.com');
  assert.equal(mailSent.at(-1).from, '"Luxora" <shop@gmail.com>');
});

test('Twilio: +91 formatting, from number, failure never throws', async () => {
  process.env.SMS_PROVIDER = 'twilio'; process.env.TWILIO_ACCOUNT_SID = 'AC1'; process.env.TWILIO_AUTH_TOKEN = 't'; process.env.TWILIO_PHONE_NUMBER = '+15550001111';
  let r = await M.sendSms({ to: '9000000020', body: 'hello' });
  assert.equal(r.success, true); assert.equal(r.messageId, 'SM123');
  assert.equal(smsSent[0].to, '+919000000020'); assert.equal(smsSent[0].from, '+15550001111'); assert.equal(smsSent[0].body, 'hello');
  failSms = true; r = await M.sendSms({ to: '+441234567890', body: 'x' });
  assert.equal(r.success, false); assert.equal(smsSent.at(-1).to, '+441234567890', 'already-international numbers untouched');
});

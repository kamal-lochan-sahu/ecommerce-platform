import crypto from 'crypto';
import { Otp } from '../models/index.js';
import { sendSms, sendMail } from './messaging.service.js';
import { getOtpEmailTemplate } from '../utils/email.js';
import ApiError from '../utils/ApiError.js';

// Industry-standard OTP hygiene for EVERY code we send (phone login, phone verify,
// email verify, add email) in one place:
//  - 6-digit code from a CSPRNG, stored only as an HMAC (a DB leak does not leak codes)
//  - valid 10 minutes, single use
//  - max 5 wrong attempts per code, then the code is destroyed
//  - 30 s cooldown between sends and max 5 sends per hour PER TARGET
//    (stops SMS-pumping / bombing a victim's phone or inbox, which per-IP limits cannot)
const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

const CHANNEL = { login: 'sms', phone_verify: 'sms', email_verify: 'email', email_add: 'email' };

const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET || 'dev-only-otp-secret';

const hashCode = (code, purpose, subject, target) =>
  crypto.createHmac('sha256', secret()).update(`${purpose}:${subject}:${target}:${code}`).digest('hex');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));

const brand = () => process.env.CLIENT_NAME || 'Luxora';

// India requires SMS text to match a pre-registered DLT template exactly. Put the
// registered text in SMS_OTP_TEMPLATE at launch ({{brand}} and {{otp}} are replaced).
const smsText = (code) =>
  (process.env.SMS_OTP_TEMPLATE || '{{brand}} OTP: {{otp}}. Valid for 10 minutes. Do not share it with anyone.')
    .replaceAll('{{brand}}', brand())
    .replaceAll('{{otp}}', code);

const deliver = async (channel, target, code) => {
  if (channel === 'sms') {
    return (await sendSms({ to: target, body: smsText(code) })).success;
  }
  return (
    await sendMail({ to: target, subject: 'Verify your email', html: getOtpEmailTemplate(code, brand()) })
  ).success;
};

// Creates/replaces the OTP for (purpose, subject) and delivers it.
//   throwOnFailure=false (used by registration) never throws for a delivery problem:
//   the account already exists and the user can tap "Resend".
export const issueOtp = async ({ purpose, subject, target, throwOnFailure = true }) => {
  const channel = CHANNEL[purpose];
  if (!channel) throw new Error(`Unknown OTP purpose "${purpose}"`);

  const now = Date.now();
  const existing = await Otp.findOne({ purpose, subject });

  let sendCount = 1;
  let windowStart = new Date(now);

  if (existing) {
    const sinceLast = now - new Date(existing.lastSentAt).getTime();
    if (sinceLast < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - sinceLast) / 1000);
      throw new ApiError(429, `Please wait ${wait} seconds before requesting another OTP.`);
    }
    if (now - new Date(existing.windowStart).getTime() < SEND_WINDOW_MS) {
      if (existing.sendCount >= MAX_SENDS_PER_WINDOW) {
        throw new ApiError(429, 'Too many OTP requests. Please try again in an hour.');
      }
      sendCount = existing.sendCount + 1;
      windowStart = new Date(existing.windowStart);
    }
  }

  const code = generateOtpCode();

  await Otp.findOneAndUpdate(
    { purpose, subject },
    {
      $set: {
        target,
        codeHash: hashCode(code, purpose, subject, target),
        expiresAt: new Date(now + OTP_TTL_MS),
        attempts: 0,
        sendCount,
        windowStart,
        lastSentAt: new Date(now),
        purgeAt: new Date(now + SEND_WINDOW_MS),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const delivered = await deliver(channel, target, code);

  if (!delivered) {
    // Nothing was delivered - do not make the user wait out a cooldown for it.
    await Otp.deleteOne({ purpose, subject });
    if (throwOnFailure) {
      throw new ApiError(
        503,
        channel === 'sms'
          ? "We couldn't send the OTP right now. Please try again in a moment."
          : "We couldn't send the verification email right now. Please try again in a moment."
      );
    }
    return { delivered: false };
  }
  return { delivered: true };
};

// Checks the code. On success the OTP is consumed (single use) and the target it was
// issued for is returned. Every failure throws an ApiError.
export const consumeOtp = async ({ purpose, subject, otp }) => {
  // Count the attempt FIRST and atomically, so parallel guesses cannot dodge the limit.
  const doc = await Otp.findOneAndUpdate({ purpose, subject }, { $inc: { attempts: 1 } }, { new: true });

  if (!doc) {
    throw new ApiError(400, 'OTP expired or not requested. Please request a new one.');
  }
  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await Otp.deleteOne({ _id: doc._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }
  if (doc.attempts > MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: doc._id });
    throw new ApiError(400, 'Too many incorrect attempts. Please request a new OTP.');
  }
  if (!safeEqual(doc.codeHash, hashCode(otp, purpose, subject, doc.target))) {
    if (doc.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: doc._id });
      throw new ApiError(400, 'Too many incorrect attempts. Please request a new OTP.');
    }
    throw new ApiError(400, 'Invalid OTP');
  }

  // Single use: only one of two parallel correct submissions can consume it.
  const consumed = await Otp.findOneAndDelete({ _id: doc._id });
  if (!consumed) throw new ApiError(400, 'Invalid OTP');

  return { target: doc.target };
};

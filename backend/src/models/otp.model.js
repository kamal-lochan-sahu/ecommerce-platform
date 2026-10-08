import mongoose from 'mongoose';

// One pending OTP per (purpose, subject). Sent by SMS or email depending on purpose:
//   login         subject = phone number          target = phone   (SMS)   - works for numbers with no account yet
//   phone_verify  subject = user id               target = phone   (SMS)   - add / verify / change phone
//   email_verify  subject = user id               target = email   (email) - verify the registration email
//   email_add     subject = user id               target = email   (email) - phone-only user adding a real email
// Kept OUT of the User document on purpose: it lets us send a login OTP to a brand-new
// number without creating a user first, and it can never overwrite the password-reset
// token that lives on User.otp.
const otpSchema = new mongoose.Schema(
  {
    purpose: { type: String, enum: ['login', 'phone_verify', 'email_verify', 'email_add'], required: true },
    subject: { type: String, required: true },
    target: { type: String, required: true },
    codeHash: { type: String, required: true }, // HMAC of the code - never the code itself
    expiresAt: { type: Date, required: true }, // code validity (10 min)
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 }, // sends inside the current 1-hour window
    windowStart: { type: Date, default: Date.now },
    lastSentAt: { type: Date, default: Date.now },
    purgeAt: { type: Date, required: true }, // TTL: kept 1h so send limits survive code expiry
  },
  { timestamps: true }
);

otpSchema.index({ purpose: 1, subject: 1 }, { unique: true });
otpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;

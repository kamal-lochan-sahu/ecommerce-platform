import jwt from 'jsonwebtoken';

// Guest ne COD ke liye phone OTP se verify kiya — uska proof ek chhota signed token hai
// (30 min, sirf usi phone ke liye). Order banate waqt server ye token check karta hai,
// isliye OTP order ke saath consume nahi karna padta (order fail ho to dubara OTP nahi).
const secret = () => `${process.env.OTP_SECRET || process.env.JWT_SECRET || 'dev-only-otp-secret'}:guest-phone`;
const PURPOSE = 'guest_checkout';

export const signGuestPhoneToken = (phone) =>
  jwt.sign({ phone, purpose: PURPOSE }, secret(), { expiresIn: '30m' });

export const isValidGuestPhoneToken = (token, phone) => {
  if (!token || !phone) return false;
  try {
    const d = jwt.verify(String(token), secret());
    return d.purpose === PURPOSE && d.phone === phone;
  } catch {
    return false;
  }
};

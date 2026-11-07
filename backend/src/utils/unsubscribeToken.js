import jwt from 'jsonwebtoken';

// Email ke "unsubscribe" link ka signed token: sirf user id + purpose. Koi expiry nahi — purani
// email ka link bhi kaam karna chahiye (unsubscribe ko mushkil banana ghalat bhi hai, kayi jagah
// kanoon ke khilaf bhi). Token sirf "marketing emails band karo" kar sakta hai, aur kuch nahi.
const secret = () => `${process.env.JWT_SECRET || process.env.OTP_SECRET || 'dev-only-unsubscribe-secret'}:unsubscribe`;
const PURPOSE = 'unsubscribe_marketing';

export const signUnsubscribeToken = (userId) =>
  jwt.sign({ uid: String(userId), purpose: PURPOSE }, secret());

// Valid hone par userId string, warna null
export const verifyUnsubscribeToken = (token) => {
  if (!token) return null;
  try {
    const d = jwt.verify(String(token), secret());
    return d.purpose === PURPOSE && d.uid ? String(d.uid) : null;
  } catch {
    return null;
  }
};

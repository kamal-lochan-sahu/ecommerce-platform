import { Order, Transaction } from '../models/index.js';
import { isPlaceholderEmail } from '../utils/identity.js';
import logger from '../utils/logger.js';

// Guest ne pehle bina account ke order kiya, ab account bana / verify kiya:
// uske VERIFIED email ya VERIFIED phone se match karte guest orders account me aa jaate hain
// (My Orders me dikhte hain).
//
// Kyun sirf verified: koi bhi kisi ka email/phone guest form me likh sakta hai, lekin account par
// wo order tabhi aata hai jab account ka asli malik (OTP se) wahi email/phone prove kare.
// Unverified email/phone se kuch claim nahi hota.
export const claimGuestOrders = async (user) => {
  if (!user?._id) return 0;

  const or = [];
  if (user.isVerified && user.email && !isPlaceholderEmail(user.email)) {
    or.push({ 'guestContact.email': String(user.email).trim().toLowerCase() });
  }
  if (user.isPhoneVerified && user.phone) {
    or.push({ 'guestContact.phone': user.phone });
  }
  if (or.length === 0) return 0;

  const orders = await Order.find({ userId: null, $or: or }).select('_id').lean();
  if (orders.length === 0) return 0;

  const ids = orders.map((o) => o._id);
  // userId: null wali condition dobara: do accounts ek saath claim karein to pehla jeete, doosra kuch na le
  const res = await Order.updateMany({ _id: { $in: ids }, userId: null }, { $set: { userId: user._id } });
  await Transaction.updateMany({ order: { $in: ids }, user: null }, { $set: { user: user._id } });
  return res?.modifiedCount ?? ids.length;
};

// Login / verify ko slow ya fail nahi karna chahiye, isliye background me
export const claimGuestOrdersInBackground = (user) => {
  claimGuestOrders(user)
    .then((n) => { if (n) logger.info(`Claimed ${n} guest order(s) for user ${user._id}`); })
    .catch((err) => logger.error(`Guest order claim failed for user ${user?._id}: ${err.message}`));
};

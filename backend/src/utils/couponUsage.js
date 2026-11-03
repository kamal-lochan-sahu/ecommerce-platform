import { User } from '../models/index.js';

// Coupon "kitni baar use hua" ek hi jagah se — logged-in user (userId) aur guest (phone = guestKey)
// dono ke liye, taaki guest ek hi coupon baar-baar guest ban kar use na kar sake.
//
//   userId          — logged-in customer
//   guestKey        — guest ka phone number
//   relatedUserIds  — guest ke phone/email wale registered accounts (same insaan ho sakta hai)
//
// usedBy ki entries null-safe hain: guest entry mein userId nahi hota.
export const countCouponUses = (coupon, { userId = null, guestKey = null, relatedUserIds = [] } = {}) => {
  const ids = new Set([...(userId ? [userId] : []), ...relatedUserIds].map(String));
  return (coupon.usedBy || []).filter(
    (u) => (u.userId && ids.has(String(u.userId))) || (guestKey && u.guestKey === guestKey)
  ).length;
};

// Guest ke phone/email se judey registered accounts (sirf usage gin-ne ke liye)
export const findRelatedUserIds = async ({ phone, email } = {}) => {
  const or = [];
  if (phone) or.push({ phone });
  if (email) or.push({ email: String(email).trim().toLowerCase() });
  if (!or.length) return [];
  const users = await User.find({ $or: or }).select('_id').limit(5).lean();
  return users.map((u) => u._id);
};

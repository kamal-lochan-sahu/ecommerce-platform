import { User } from '../models/index.js';

// Order ka customer kaun hai — registered user ho ya guest — ek jagah se.
// Email / SMS / invoice sab isi se naam, email, phone lete hain, taaki guest orders
// (jinka userId null hota hai) bhi bina alag code ke kaam karein.
//
// Returns { name, email, phone, isPhoneVerified, isGuest } ya null (user delete ho chuka ho).
export const getOrderRecipient = async (order) => {
  if (order?.userId) {
    const user = await User.findById(order.userId).select('name email phone isPhoneVerified').lean();
    if (!user) return null;
    return { ...user, isGuest: false };
  }
  const g = order?.guestContact || {};
  return {
    name: g.name || order?.shippingAddress?.fullName || '',
    email: g.email || '',
    phone: g.phone || order?.shippingAddress?.phone || '',
    isPhoneVerified: !!g.phoneVerified,
    isGuest: true,
  };
};

export const isGuestOrder = (order) => !order?.userId;

// Order status ke business rules - ek hi jagah, taaki backend (validation) aur
// admin UI (dropdown mein kya dikhana hai) kabhi alag-alag na ho jaayein.
//
// Flow:  placed -> confirmed -> processing -> shipped -> delivered
//   - Aage kood sakte hain (placed -> shipped), peeche kabhi nahi (delivered -> processing nahi).
//   - cancelled: delivered se pehle kabhi bhi (shipped par = courier se wapas / RTO).
//   - returned: sirf delivered ke baad.
//   - cancelled / returned final hain.
//   - Online (razorpay/stripe) order ka paisa aaya nahi to use pack/ship nahi kar sakte,
//     sirf cancel. COD mein paisa delivery par aata hai, isliye COD aage badh sakta hai.

export const STATUS_FLOW = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
export const FINAL_STATUSES = ['cancelled', 'returned'];

// Kya is order ko fulfil (pack/ship) kar sakte hain?
export const canFulfil = (order) =>
  order.paymentMethod === 'cod' || order.paymentStatus === 'paid';

// Admin is order ko abhi kin statuses mein le ja sakta hai
export const allowedNextStatuses = (order) => {
  const current = order.orderStatus;
  if (FINAL_STATUSES.includes(current)) return [];

  if (!canFulfil(order)) return ['cancelled'];

  const forward = STATUS_FLOW.slice(STATUS_FLOW.indexOf(current) + 1);
  return current === 'delivered' ? ['returned'] : [...forward, 'cancelled'];
};

// Cancel/return ho chuka par customer ka paisa wapas nahi gaya = refund baaki hai
export const isRefundDue = (order) =>
  FINAL_STATUSES.includes(order.orderStatus) && order.paymentStatus === 'paid';

// { ok:true } ya { ok:false, message }
export const checkTransition = (order, target) => {
  if (FINAL_STATUSES.includes(order.orderStatus)) {
    return { ok: false, message: `This order is ${order.orderStatus} and cannot be changed` };
  }
  if (allowedNextStatuses(order).includes(target)) return { ok: true };

  if (!canFulfil(order)) {
    return {
      ok: false,
      message: 'Payment for this online order is not received yet, so it cannot be processed or shipped. Wait for payment or cancel it',
    };
  }
  return { ok: false, message: `Cannot move an order from "${order.orderStatus}" to "${target}"` };
};

// Mongo filter: refund baaki wale orders
export const REFUND_DUE_FILTER = {
  orderStatus: { $in: FINAL_STATUSES },
  paymentStatus: 'paid',
};

// Revenue mein sirf wahi order gine jaate hain jinka paisa aaya aur jo cancel/return nahi hue.
// (Cancel ho chuka paid order refund ke liye hai, kamai nahi.)
export const REVENUE_MATCH = {
  paymentStatus: 'paid',
  orderStatus: { $nin: FINAL_STATUSES },
};

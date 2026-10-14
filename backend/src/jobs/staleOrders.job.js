import cron from "node-cron";
import { Order } from "../models/index.js";
import { cancelOrderAndRestore } from "../services/orderLifecycle.service.js";

// ─── Stale Pending Orders Job ─────────────────────────────────
// Har 15 minute mein chalta hai.
// Online payment (Razorpay/Stripe) wale orders jinka payment STALE_ORDER_MINUTES
// (default 60) se pending hai — customer ne payment chhod diya — unhe cancel karta hai
// aur stock + coupon wapas karta hai, warna stock hamesha ke liye lock rehta.
//
// COD orders ko KABHI nahi chhoota: COD mein payment delivery pe hoti hai,
// "placed + pending" unke liye normal state hai.

export const cancelStaleOrders = async (now = new Date()) => {
  const minutes = Number(process.env.STALE_ORDER_MINUTES) || 60;
  const cutoff = new Date(now.getTime() - minutes * 60 * 1000);

  const stale = await Order.find({
    paymentMethod: { $in: ["razorpay", "stripe"] },
    paymentStatus: "pending",
    orderStatus: "placed",
    createdAt: { $lt: cutoff },
  })
    .select("_id")
    .limit(100)
    .lean();

  let cancelled = 0;
  for (const { _id } of stale) {
    try {
      const result = await cancelOrderAndRestore(_id, {
        allowedFrom: ["placed"],
        onlyIfUnpaid: true,
        markPaymentFailed: true,
        reason: "Payment was not completed in time",
        notify: true,
      });
      if (result.cancelled) cancelled++;
    } catch (err) {
      console.error(`Error cancelling stale order ${_id}:`, err.message);
    }
  }
  return { found: stale.length, cancelled };
};

// node-cron v4: cron.schedule() task ko import hote hi START kar deta hai (scheduled:false ignore
// hota hai). createTask() start nahi karta — task sirf startCronJobs() se chalta hai,
// yaani ENABLE_CRON_JOBS=true hone pe.
const staleOrdersJob = cron.createTask(
  "*/15 * * * *",
  async () => {
    console.log("🕐 [CRON] Stale Orders Job started:", new Date().toISOString());
    try {
      const { found, cancelled } = await cancelStaleOrders();
      console.log(`✅ [CRON] Stale Orders: ${found} found, ${cancelled} cancelled`);
    } catch (error) {
      console.error("❌ [CRON] Stale Orders Job failed:", error.message);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);

export default staleOrdersJob;

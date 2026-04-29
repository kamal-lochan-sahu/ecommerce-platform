import cron from "node-cron";
import Coupon from "../models/coupon.model.js";

// ─── Expire Coupons Job ───────────────────────────────────────
// Har din midnight pe run karta hai
// Expired coupons ko deactivate karta hai

const expireCouponsJob = cron.schedule(
  "0 0 * * *", // Har din 12:00 AM IST
  async () => {
    console.log("🕐 [CRON] Expire Coupons Job started:", new Date().toISOString());

    try {
      const now = new Date();

      // Expired but still active coupons
      const result = await Coupon.updateMany(
        {
          isActive: true,
          expiresAt: { $lt: now },
        },
        {
          $set: { isActive: false },
        }
      );

      // Usage limit puri ho gayi coupons
      const usageLimitResult = await Coupon.updateMany(
        {
          isActive: true,
          $expr: { $gte: ["$usedCount", "$maxUses"] },
          maxUses: { $gt: 0 },
        },
        {
          $set: { isActive: false },
        }
      );

      const totalDeactivated =
        result.modifiedCount + usageLimitResult.modifiedCount;
      console.log(
        `✅ [CRON] Expire Coupons: ${result.modifiedCount} expired, ${usageLimitResult.modifiedCount} usage-limit reached. Total: ${totalDeactivated}`
      );

      // Kal expire hone wale coupons count karo (info ke liye)
      const expiringSoon = await Coupon.countDocuments({
        isActive: true,
        expiresAt: {
          $gte: now,
          $lt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      if (expiringSoon > 0) {
        console.log(`⚠️ [CRON] ${expiringSoon} coupons expiring in next 24 hours`);
      }
    } catch (error) {
      console.error("❌ [CRON] Expire Coupons Job failed:", error.message);
    }
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata",
  }
);

export default expireCouponsJob;
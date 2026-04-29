import abandonedCartJob from "./abandonedCart.job.js";
import expireCouponsJob from "./expireCoupons.job.js";
import lowStockAlertJob from "./lowStockAlert.job.js";
import loyaltyExpiryJob from "./loyaltyExpiry.job.js";

export const startCronJobs = () => {
  if (process.env.ENABLE_CRON_JOBS !== "true") {
    console.log("⏸️ Cron jobs disabled (ENABLE_CRON_JOBS != true)");
    return;
  }

  abandonedCartJob.start();
  expireCouponsJob.start();
  lowStockAlertJob.start();
  loyaltyExpiryJob.start();

  console.log("✅ All cron jobs started:");
  console.log("   🛒 Abandoned Cart     — Every hour");
  console.log("   🎟️ Expire Coupons     — Daily midnight");
  console.log("   📦 Low Stock Alert    — Daily 9 AM IST");
  console.log("   🏆 Loyalty Expiry     — Daily 10 AM IST");
};

export const stopCronJobs = () => {
  abandonedCartJob.stop();
  expireCouponsJob.stop();
  lowStockAlertJob.stop();
  loyaltyExpiryJob.stop();
  console.log("⏹️ All cron jobs stopped");
};

export {
  abandonedCartJob,
  expireCouponsJob,
  lowStockAlertJob,
  loyaltyExpiryJob,
};
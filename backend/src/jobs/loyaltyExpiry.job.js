import cron from "node-cron";
import User from "../models/user.model.js";
import { createNotification } from "../services/notification.service.js";
import sendEmail from "../services/email.service.js";

// ─── Loyalty Points Expiry Job ────────────────────────────────
// Har din 10 AM IST pe run karta hai
// Points jo 30 din mein expire honge unka reminder bhejta hai
// Points jo expire ho gaye hain unhe deduct karta hai

const loyaltyExpiryJob = cron.schedule(
  "0 10 * * *", // Har din 10:00 AM IST
  async () => {
    console.log(
      "🕐 [CRON] Loyalty Expiry Job started:",
      new Date().toISOString()
    );

    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // ── 1. Expired Points Deduct Karo ─────────────────────
      const expiredUsers = await User.find({
        loyaltyPoints: { $gt: 0 },
        loyaltyPointsExpiresAt: { $lt: now },
      }).select("_id name email loyaltyPoints");

      let pointsExpiredCount = 0;
      for (const user of expiredUsers) {
        const expiredPoints = user.loyaltyPoints;

        await User.findByIdAndUpdate(user._id, {
          $set: {
            loyaltyPoints: 0,
            loyaltyPointsExpiresAt: null,
          },
          $push: {
            loyaltyHistory: {
              type: "expired",
              points: -expiredPoints,
              description: "Points expired",
              date: now,
            },
          },
        });

        // Email notification
        await sendEmail({
          to: user.email,
          subject: "Your loyalty points have expired — MyShop",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #e74c3c;">⏰ Loyalty Points Expired</h2>
              <p>Hi <strong>${user.name}</strong>,</p>
              <p>Unfortunately, your <strong>${expiredPoints} loyalty points</strong> have expired as they were not used within the validity period.</p>
              <p>Don't worry! You can earn new points on every purchase.</p>
              <a href="${process.env.FRONTEND_URL}" 
                 style="display:inline-block; background:#667eea; color:white; padding:10px 24px; border-radius:6px; text-decoration:none; margin-top:12px">
                Shop & Earn Points →
              </a>
            </div>
          `,
        });

        pointsExpiredCount++;
      }

      // ── 2. 30 Din Mein Expire Reminder ────────────────────
      const thirtyDayReminderUsers = await User.find({
        loyaltyPoints: { $gt: 0 },
        loyaltyPointsExpiresAt: {
          $gte: sevenDaysFromNow,
          $lte: thirtyDaysFromNow,
        },
        loyaltyExpiryReminder30Sent: { $ne: true },
      }).select("_id name email loyaltyPoints loyaltyPointsExpiresAt");

      let reminders30Sent = 0;
      for (const user of thirtyDayReminderUsers) {
        const daysLeft = Math.ceil(
          (user.loyaltyPointsExpiresAt - now) / (1000 * 60 * 60 * 24)
        );

        await createNotification(user._id, "LOYALTY_POINTS_EXPIRING", {
          points: user.loyaltyPoints,
          daysLeft,
        });

        await User.findByIdAndUpdate(user._id, {
          loyaltyExpiryReminder30Sent: true,
        });

        reminders30Sent++;
      }

      // ── 3. 7 Din Mein Expire Urgent Reminder ──────────────
      const sevenDayReminderUsers = await User.find({
        loyaltyPoints: { $gt: 0 },
        loyaltyPointsExpiresAt: { $gte: now, $lte: sevenDaysFromNow },
        loyaltyExpiryReminder7Sent: { $ne: true },
      }).select("_id name email loyaltyPoints loyaltyPointsExpiresAt");

      let reminders7Sent = 0;
      for (const user of sevenDayReminderUsers) {
        const daysLeft = Math.ceil(
          (user.loyaltyPointsExpiresAt - now) / (1000 * 60 * 60 * 24)
        );

        // Email + notification dono
        await sendEmail({
          to: user.email,
          subject: `⚠️ ${user.loyaltyPoints} points expiring in ${daysLeft} days!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #f39c12;">⚠️ Urgent: Points Expiring in ${daysLeft} Days!</h2>
              <p>Hi <strong>${user.name}</strong>,</p>
              <p>Your <strong>${user.loyaltyPoints} loyalty points</strong> will expire in just <strong>${daysLeft} days</strong>!</p>
              <p>Use them now before they're gone. Each 100 points = ₹10 discount.</p>
              <a href="${process.env.FRONTEND_URL}" 
                 style="display:inline-block; background:#f39c12; color:white; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:bold; margin-top:12px">
                🛍️ Use My Points Now
              </a>
            </div>
          `,
        });

        await createNotification(user._id, "LOYALTY_POINTS_EXPIRING", {
          points: user.loyaltyPoints,
          daysLeft,
        });

        await User.findByIdAndUpdate(user._id, {
          loyaltyExpiryReminder7Sent: true,
        });

        reminders7Sent++;
      }

      console.log(
        `✅ [CRON] Loyalty Expiry — Expired: ${pointsExpiredCount}, 30d Reminders: ${reminders30Sent}, 7d Reminders: ${reminders7Sent}`
      );
    } catch (error) {
      console.error("❌ [CRON] Loyalty Expiry Job failed:", error.message);
    }
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata",
  }
);

export default loyaltyExpiryJob;
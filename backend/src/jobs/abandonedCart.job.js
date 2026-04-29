import cron from "node-cron";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import { sendAbandonedCartEmail } from "../services/email.service.js";

// ─── Abandoned Cart Job ───────────────────────────────────────
// Har ghante run karta hai
// Users jinhone cart mein items daale hain par 1 ghante se checkout nahi kiya

const abandonedCartJob = cron.schedule(
  "0 * * * *", // Har ghante ke top pe
  async () => {
    console.log("🕐 [CRON] Abandoned Cart Job started:", new Date().toISOString());

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Carts jo 1-24 ghante purane hain aur reminder nahi bheja gaya
      const abandonedCarts = await Cart.find({
        updatedAt: { $lte: oneHourAgo, $gte: twentyFourHoursAgo },
        "items.0": { $exists: true }, // Non-empty carts
        reminderSentAt: { $exists: false }, // Reminder already nahi bheja
      })
        .populate({
          path: "items.product",
          select: "name price images isActive",
        })
        .populate({
          path: "user",
          select: "name email marketingEmails",
        })
        .lean();

      console.log(`📊 Found ${abandonedCarts.length} abandoned carts`);

      let emailsSent = 0;
      let errors = 0;

      for (const cart of abandonedCarts) {
        try {
          // User check — exist karta hai? email marketing allow hai?
          if (!cart.user || !cart.user.email) continue;
          if (cart.user.marketingEmails === false) continue;

          // Active products filter karo
          const activeItems = cart.items.filter((item) => item.product?.isActive);
          if (activeItems.length === 0) continue;

          // Email bhejo
          const result = await sendAbandonedCartEmail(cart.user, {
            items: activeItems,
          });

          if (result.success) {
            // Mark as reminded
            await Cart.findByIdAndUpdate(cart._id, {
              reminderSentAt: new Date(),
            });
            emailsSent++;
          }

          // Rate limiting — emails ke beech 100ms delay
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (itemError) {
          console.error(`Error processing cart ${cart._id}:`, itemError.message);
          errors++;
        }
      }

      console.log(
        `✅ [CRON] Abandoned Cart: ${emailsSent} emails sent, ${errors} errors`
      );
    } catch (error) {
      console.error("❌ [CRON] Abandoned Cart Job failed:", error.message);
    }
  },
  {
    scheduled: false, // Manually start karenge
    timezone: "Asia/Kolkata",
  }
);

export default abandonedCartJob;
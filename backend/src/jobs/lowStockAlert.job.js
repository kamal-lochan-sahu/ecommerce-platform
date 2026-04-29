import cron from "node-cron";
import Product from "../models/product.model.js";
import { sendLowStockAlertEmail } from "../services/email.service.js";

// ─── Low Stock Alert Job ──────────────────────────────────────
// Har din 9 AM IST pe run karta hai
// Admin ko low stock + out of stock products ka email bhejta hai

const lowStockAlertJob = cron.schedule(
  "0 9 * * *", // Har din 9:00 AM IST
  async () => {
    console.log("🕐 [CRON] Low Stock Alert Job started:", new Date().toISOString());

    try {
      // Low stock threshold se kam products
      const lowStockProducts = await Product.find({
        isActive: true,
        $or: [
          { stock: 0 }, // Out of stock
          { $expr: { $lte: ["$stock", "$lowStockThreshold"] } }, // Below threshold
        ],
      })
        .select("name sku stock lowStockThreshold category")
        .populate("category", "name")
        .lean();

      if (lowStockProducts.length === 0) {
        console.log("✅ [CRON] Low Stock: No low stock products today");
        return;
      }

      console.log(
        `📊 [CRON] Low Stock: ${lowStockProducts.length} products need attention`
      );

      // Format for email
      const formattedProducts = lowStockProducts.map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold || 10,
        category: p.category?.name || "Uncategorized",
      }));

      // Alert email bhejo
      const result = await sendLowStockAlertEmail(formattedProducts);

      if (result.success) {
        console.log(
          `✅ [CRON] Low Stock Alert sent to admin for ${lowStockProducts.length} products`
        );
      } else {
        console.error("❌ [CRON] Low Stock Alert email failed:", result.error);
      }

      // Stock 0 wale products temporarily unavailable mark karo
      const outOfStockIds = lowStockProducts
        .filter((p) => p.stock === 0)
        .map((p) => p._id);

      if (outOfStockIds.length > 0) {
        await Product.updateMany(
          { _id: { $in: outOfStockIds } },
          { $set: { inStock: false } }
        );
        console.log(
          `📦 [CRON] ${outOfStockIds.length} products marked as out of stock`
        );
      }
    } catch (error) {
      console.error("❌ [CRON] Low Stock Alert Job failed:", error.message);
    }
  },
  {
    scheduled: false,
    timezone: "Asia/Kolkata",
  }
);

export default lowStockAlertJob;
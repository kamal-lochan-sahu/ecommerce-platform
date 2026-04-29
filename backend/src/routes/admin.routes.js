import { Router } from "express";
import {
  getDashboard,
  getSalesAnalytics,
  getProductAnalytics,
  getAllCustomers,
  getCustomerById,
  updateCustomerStatus,
  getAllReviews,
  approveReview,
  rejectReview,
  getLowStockProducts,
} from "../controllers/admin.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";

const router = Router();

// Sab routes admin-only hain
router.use(protect, adminOnly);

// Dashboard
router.get("/dashboard", getDashboard);

// Analytics
router.get("/analytics/sales", getSalesAnalytics);
router.get("/analytics/products", getProductAnalytics);

// Customers
router.get("/customers", getAllCustomers);
router.get("/customers/:id", getCustomerById);
router.put("/customers/:id/status", updateCustomerStatus);

// Reviews
router.get("/reviews", getAllReviews);
router.put("/reviews/:id/approve", approveReview);
router.put("/reviews/:id/reject", rejectReview);

// Low Stock
router.get("/low-stock", getLowStockProducts);

export default router;
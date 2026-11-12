import { Router } from "express";
import { getPublicSettings } from "../controllers/admin.controller.js";
import { getStorePages } from "../controllers/store.controller.js";

const router = Router();

// Public — checkout needs these to show the real, final price before payment
router.get("/public", getPublicSettings);

// Public — Terms, Privacy, Shipping, Returns, FAQs (admin ka text ya settings se bana default)
router.get("/pages", getStorePages);

export default router;

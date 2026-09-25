import { Router } from "express";
import { getPublicSettings } from "../controllers/admin.controller.js";

const router = Router();

// Public — checkout needs these to show the real, final price before payment
router.get("/public", getPublicSettings);

export default router;

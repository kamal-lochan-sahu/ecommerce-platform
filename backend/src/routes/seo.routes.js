import { Router } from 'express';
import { getRobotsTxt, getSitemapXml } from '../controllers/store.controller.js';

const router = Router();

// Public. Storefront domain ke /robots.txt aur /sitemap.xml yahin se serve hote hain (frontend/vercel.json).
router.get('/robots.txt', getRobotsTxt);
router.get('/sitemap.xml', getSitemapXml);

export default router;

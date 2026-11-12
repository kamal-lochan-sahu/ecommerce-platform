import { Settings, Product, Category } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { resolveStorePages, buildDefaultStorePages } from '../utils/storePages.js';
import { buildRobotsTxt, buildSitemapXml, siteBaseUrl } from '../utils/seo.js';

// ─── GET /api/settings/pages ─────────────────────────────────────────────────
// Terms / Privacy / Shipping / Returns / FAQs: admin ka custom text ya settings se bana default.
// ?defaults=1 -> hamesha default text (Admin "Reset to default" ke liye).
export const getStorePages = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const data = req.query.defaults ? buildDefaultStorePages(settings) : resolveStorePages(settings);
  res.set('Cache-Control', 'no-cache');
  return res.status(200).json(new ApiResponse(200, data, 'Store pages fetched'));
});

// ─── GET /api/seo/robots.txt  and  /api/seo/sitemap.xml ──────────────────────
export const getRobotsTxt = (req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(buildRobotsTxt(siteBaseUrl()));
};

export const getSitemapXml = asyncHandler(async (req, res) => {
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, deletedAt: null }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(5000).lean(),
    Category.find({ isActive: true }).select('slug').lean(),
  ]);
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600')
    .send(buildSitemapXml({ siteUrl: siteBaseUrl(), products, categories }));
});

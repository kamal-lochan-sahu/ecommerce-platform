// robots.txt aur sitemap.xml. Storefront ke domain par ye vercel.json rewrite se backend se aate hain
// (/robots.txt -> /api/seo/robots.txt), isliye URL hamesha storefront ke domain ke hote hain.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// Storefront ka asli address: SITE_URL (agar alag set ho), warna CLIENT_URL / FRONTEND_URL.
export const siteBaseUrl = () =>
  String(process.env.SITE_URL || process.env.CLIENT_URL || process.env.FRONTEND_URL || '')
    .trim()
    .replace(/\/+$/, '');

export const STATIC_PATHS = ['/', '/products', '/track-order', '/contact', '/faq', '/terms', '/privacy', '/shipping-policy', '/returns-policy'];

// Customer-private ya kaam ke pages: search engines ko inki zarurat nahi.
export const PRIVATE_PATHS = [
  '/admin', '/cart', '/checkout', '/order-success', '/orders', '/profile', '/addresses', '/wishlist',
  '/notifications', '/loyalty', '/login', '/register', '/forgot-password', '/reset-password', '/verify-otp', '/unsubscribe', '/search',
];

export const buildRobotsTxt = (siteUrl) => {
  const lines = ['User-agent: *', 'Allow: /', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`)];
  if (siteUrl) lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
};

const urlTag = (loc, lastmod) =>
  `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;

export const buildSitemapXml = ({ siteUrl = '', products = [], categories = [] } = {}) => {
  const tags = [
    ...STATIC_PATHS.map((p) => urlTag(`${siteUrl}${p === '/' ? '' : p}${p === '/' ? '/' : ''}`)),
    ...categories.filter((c) => c?.slug).map((c) => urlTag(`${siteUrl}/products?category=${encodeURIComponent(c.slug)}`)),
    ...products.filter((p) => p?.slug).map((p) => urlTag(`${siteUrl}/products/${encodeURIComponent(p.slug)}`, p.updatedAt)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${tags.join('\n')}\n</urlset>\n`;
};

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
// Per-client build: naam / description / theme VITE_* env se (Vercel mein set karo). PWA manifest build time par
// banta hai, isliye ye Admin Settings se nahi badal sakta. Icons: public/icons/ mein client ke apne icons rakho.
const env = loadEnv(mode, '.', 'VITE_')
const NAME = env.VITE_CLIENT_NAME || 'Luxora'
const DESCRIPTION = env.VITE_CLIENT_DESCRIPTION || 'Online store'
const THEME = env.VITE_PRIMARY_COLOR || '#6366f1'

return {
  plugins: [
    react(),
    {
      name: 'brand-html',
      transformIndexHtml: (html) => html.replace(/<title>[^<]*<\/title>/, `<title>${NAME}</title>`),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: NAME,
        short_name: NAME.length > 12 ? NAME.slice(0, 12) : NAME,
        description: DESCRIPTION,
        theme_color: THEME,
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/icons/screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: `${NAME} Desktop`,
          },
          {
            src: '/icons/screenshot-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: `${NAME} Mobile`,
          },
        ],
        categories: ['shopping', 'lifestyle'],
        shortcuts: [
          {
            name: 'Shop Now',
            url: '/products',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'My Orders',
            url: '/orders',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Cart',
            url: '/cart',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // robots.txt / sitemap.xml server se aate hain; app ka index.html unki jagah na dikhe
        navigateFallbackDenylist: [/^\/robots\.txt$/, /^\/sitemap\.xml$/, /^\/api\//],
        runtimeCaching: [
          // Admin data kabhi cache nahi: stock / orders jaisi cheezein turant sahi dikhni chahiye.
          // (Pehle ye /api/products/admin/... bhi pakad leta tha aur ghante bhar purana stock dikhata tha.)
          // Rules upar se neeche match hote hain, isliye ye rule storefront wale se PEHLE hona chahiye.
          {
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/products\/admin/,
            handler: 'NetworkOnly',
          },
          // Storefront: pehle network (taaki price/stock taaza dikhe). Network na chale / 4s se slow ho
          // to saved copy (offline browsing). StaleWhileRevalidate pehle purana jawab dikhata tha.
          {
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/(products|categories)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          {
            urlPattern: /^https:\/\/picsum\.photos\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Charting stack (recharts + its d3-* deps) is only pulled in by
          // the two admin pages (Dashboard, Analytics), which are already
          // route-lazy-loaded. Giving it its own named chunk stops Rollup
          // from naming it after an unrelated component (it was showing up
          // as "StatsCard-*.js") and keeps it cacheable independently of
          // the admin page code itself.
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
        },
      },
    },
  },
}
})

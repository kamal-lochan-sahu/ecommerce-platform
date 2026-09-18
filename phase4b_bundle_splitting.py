#!/usr/bin/env python3
"""
Phase 4(b) — Bundle splitting: manualChunks in vite.config.js

Run this from the root of your ecommerce-platform repo:
    python3 phase4b_bundle_splitting.py

What it does:
  Adds a `build.rollupOptions.output.manualChunks` function to
  frontend/vite.config.js that puts recharts + its d3-* deps into a
  clearly-named "vendor-charts" chunk (previously showing up as a
  mislabeled "StatsCard-*.js" ~338kb chunk), and splits react /
  react-dom / react-router-dom into their own cacheable vendor chunks.

Result measured locally: main entry bundle dropped from ~355kB to
~124kB (this is what every customer downloads on first load). The
charts chunk (~407kB) stays isolated and is only ever fetched when an
admin opens Dashboard or Analytics — those routes were already
React.lazy()'d.

Safe to re-run: skips if already patched.
"""
import os
import sys

ROOT = os.getcwd()
VITE_CONFIG_PATH = os.path.join(ROOT, "frontend", "vite.config.js")

OLD_TAIL = """  server: {
    port: 5173,
  },
})"""

NEW_TAIL = """  server: {
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
})"""


def main():
    if not os.path.isfile(VITE_CONFIG_PATH):
        print(f"[ERROR] {VITE_CONFIG_PATH} not found. Run this script from the repo root "
              f"(the folder that contains 'frontend/' and 'backend/').")
        sys.exit(1)

    with open(VITE_CONFIG_PATH, "r") as f:
        content = f.read()

    if "manualChunks" in content:
        print("[skip] vite.config.js already has manualChunks — nothing to do.")
        return

    if OLD_TAIL not in content:
        print("[WARN] Could not find the expected end of vite.config.js "
              "(server: { port: 5173 } block). File may have changed — "
              "patch it manually using the diff in the chat instead.")
        sys.exit(1)

    content = content.replace(OLD_TAIL, NEW_TAIL, 1)

    with open(VITE_CONFIG_PATH, "w") as f:
        f.write(content)

    print(f"[OK] patched {VITE_CONFIG_PATH}")
    print("\nNow verify with:")
    print("  cd frontend")
    print("  rm -rf dist && npm run build")
    print('  # look for "vendor-charts-*.js" and "vendor-react-*.js" in the output,')
    print('  # and confirm "index-*.js" (main entry) is much smaller than before')


if __name__ == "__main__":
    main()

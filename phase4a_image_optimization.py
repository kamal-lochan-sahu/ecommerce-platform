#!/usr/bin/env python3
"""
Phase 4(a) — Image lazy loading + srcset for ProductCard / ProductGrid

Run this from the root of your ecommerce-platform repo:
    python3 phase4a_image_optimization.py

What it does:
  1. Creates frontend/src/utils/image.js — a helper that builds a
     responsive srcSet for Unsplash-hosted images (falls back to a
     plain <img src> for any other host, e.g. placehold.co).
  2. Patches ProductCard.jsx (grid card) to use it + adds
     decoding="async" and explicit width/height (prevents layout shift).
  3. Patches ProductGrid.jsx's ListProductCard (list view) which had
     NO lazy loading at all — adds loading="lazy" + srcset there too.

Safe to re-run: skips a file if the target string isn't found and
tells you so instead of crashing silently.
"""
import os
import sys

ROOT = os.getcwd()
FRONTEND_SRC = os.path.join(ROOT, "frontend", "src")

IMAGE_UTIL_PATH = os.path.join(FRONTEND_SRC, "utils", "image.js")
PRODUCT_CARD_PATH = os.path.join(FRONTEND_SRC, "components", "product", "ProductCard.jsx")
PRODUCT_GRID_PATH = os.path.join(FRONTEND_SRC, "components", "product", "ProductGrid.jsx")

IMAGE_UTIL_CONTENT = '''// Responsive image helpers.
// Unsplash serves images through an image-resizing API (imgix-style query
// params), so we can ask for exactly the widths we need instead of shipping
// one full-size JPEG to every viewport. Any other host (e.g. placehold.co
// fallback) just gets its src passed through unchanged.

const UNSPLASH_HOST = "images.unsplash.com";
const DEFAULT_WIDTHS = [200, 400, 600, 800];

function withWidth(url, width) {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("q", "75");
    return u.toString();
  } catch {
    return url;
  }
}

export function isUnsplashUrl(url) {
  return typeof url === "string" && url.includes(UNSPLASH_HOST);
}

export function buildSrcSet(url, widths = DEFAULT_WIDTHS) {
  if (!isUnsplashUrl(url)) return undefined;
  return widths.map((w) => `${withWidth(url, w)} ${w}w`).join(", ");
}

/**
 * Spread this onto an <img> tag: <img {...buildResponsiveImageProps(url)} .../>
 * Returns { src, srcSet, sizes } for Unsplash URLs, or just { src } otherwise.
 */
export function buildResponsiveImageProps(url, { widths = DEFAULT_WIDTHS, sizes } = {}) {
  if (!isUnsplashUrl(url)) {
    return { src: url };
  }
  return {
    src: withWidth(url, widths[widths.length - 1]),
    srcSet: buildSrcSet(url, widths),
    sizes: sizes || "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  };
}
'''

def write_image_util():
    os.makedirs(os.path.dirname(IMAGE_UTIL_PATH), exist_ok=True)
    with open(IMAGE_UTIL_PATH, "w") as f:
        f.write(IMAGE_UTIL_CONTENT)
    print(f"[OK] wrote {IMAGE_UTIL_PATH}")


def patch_product_card():
    with open(PRODUCT_CARD_PATH, "r") as f:
        content = f.read()

    changed = False

    old_import = 'import useAuthStore from "../../store/authStore";'
    new_import = (
        'import useAuthStore from "../../store/authStore";\n'
        'import { buildResponsiveImageProps } from "../../utils/image";'
    )
    if old_import in content and "utils/image" not in content:
        content = content.replace(old_import, new_import, 1)
        changed = True
    else:
        print("[skip] import line not found or already patched in ProductCard.jsx")

    old_img = (
        '          <img src={imageUrl} alt={name}\n'
        '            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"\n'
        '            loading="lazy" />'
    )
    new_img = (
        '          <img {...buildResponsiveImageProps(imageUrl)} alt={name}\n'
        '            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"\n'
        '            loading="lazy" decoding="async" width={400} height={400} />'
    )
    if old_img in content:
        content = content.replace(old_img, new_img, 1)
        changed = True
    else:
        print("[skip] <img> block not found or already patched in ProductCard.jsx")

    if changed:
        with open(PRODUCT_CARD_PATH, "w") as f:
            f.write(content)
        print(f"[OK] patched {PRODUCT_CARD_PATH}")
    else:
        print(f"[WARN] nothing changed in {PRODUCT_CARD_PATH} — check manually")


def patch_product_grid():
    with open(PRODUCT_GRID_PATH, "r") as f:
        content = f.read()

    changed = False

    old_import = 'import Pagination from "../ui/Pagination";'
    new_import = (
        'import Pagination from "../ui/Pagination";\n'
        'import { buildResponsiveImageProps } from "../../utils/image";'
    )
    if old_import in content and "utils/image" not in content:
        content = content.replace(old_import, new_import, 1)
        changed = True
    else:
        print("[skip] import line not found or already patched in ProductGrid.jsx")

    old_img = (
        '        <img\n'
        '          src={images?.[0] || "https://placehold.co/400x400?text=Product"}\n'
        '          alt={name}\n'
        '          className="w-full h-full object-cover"\n'
        '        />'
    )
    new_img = (
        '        <img\n'
        '          {...buildResponsiveImageProps(\n'
        '            images?.[0] || "https://placehold.co/400x400?text=Product",\n'
        '            { widths: [112, 224], sizes: "112px" }\n'
        '          )}\n'
        '          alt={name}\n'
        '          className="w-full h-full object-cover"\n'
        '          loading="lazy"\n'
        '          decoding="async"\n'
        '          width={112}\n'
        '          height={112}\n'
        '        />'
    )
    if old_img in content:
        content = content.replace(old_img, new_img, 1)
        changed = True
    else:
        print("[skip] <img> block not found or already patched in ProductGrid.jsx")

    if changed:
        with open(PRODUCT_GRID_PATH, "w") as f:
            f.write(content)
        print(f"[OK] patched {PRODUCT_GRID_PATH}")
    else:
        print(f"[WARN] nothing changed in {PRODUCT_GRID_PATH} — check manually")


def main():
    if not os.path.isdir(FRONTEND_SRC):
        print(f"[ERROR] {FRONTEND_SRC} not found. Run this script from the repo root "
              f"(the folder that contains 'frontend/' and 'backend/').")
        sys.exit(1)

    write_image_util()
    patch_product_card()
    patch_product_grid()

    print("\nDone. Now verify with:")
    print("  git diff frontend/src/components/product/ProductCard.jsx")
    print("  git diff frontend/src/components/product/ProductGrid.jsx")
    print("  cat frontend/src/utils/image.js")


if __name__ == "__main__":
    main()

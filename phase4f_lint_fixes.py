#!/usr/bin/env python3
"""
Phase 4(f) — Fix all frontend lint errors/warnings (was 38: 35 errors + 3 warnings)

Run this from the root of your ecommerce-platform repo, AFTER phase4a–4e:
    python3 phase4f_lint_fixes.py

Most of these are routine cleanup (unused imports/vars), but a few are
real bugs, called out below:

  * Wishlist.jsx — `useWishlistStore` was called but never imported.
    This page would throw a ReferenceError as soon as it rendered.
    Fixed by removing the call (it was unused anyway — removal already
    happens via the API mutation, not the store).
  * auth.service.js — `verifyEmail` was defined 3 times in the same
    object literal (silently overwritten twice). Removed the dupes.
  * DealTimer.jsx — a `Box` sub-component was declared INSIDE the
    parent component, so React recreated it on every render (resets
    its internals each time). Moved it outside.
  * Products.jsx (admin) — `setPage` was declared but never called
    anywhere, meaning the admin product list was permanently stuck on
    page 1 with no way to navigate. Wired up the existing shared
    <Pagination> component to fix it for real.
  * ProductListing.jsx — `isError` was fetched from the query but
    never rendered, so a failed product fetch showed nothing useful.
    Added a real error state with a Retry button.
  * ProductDetail.jsx — `selectedColor`/`selectedSize` were being set
    via setState inside an effect when the product loaded. Replaced
    with derived defaults computed at render time (product's first
    color/size until the user picks one) — same behavior, no effect
    needed, and satisfies the react-hooks/set-state-in-effect rule.
  * PWAInstallPrompt.jsx / SearchBar.jsx — same
    set-state-in-effect pattern, fixed the same way (lazy useState
    initializers / removing now-redundant resets already covered by
    JSX conditions).
  * tailwind.config.js — used require() in a file whose package.json
    has "type": "module", where require isn't a valid global.
    Converted to static ES imports (same resulting plugin values).

Everything else is unused-import / unused-var / empty-catch-comment
cleanup with no behavior change.

Verified locally: `npx eslint .` returns zero problems after this
script, and `npm run build` succeeds.

Safe to re-run: skips a file's edit if the target text isn't found
(e.g. already patched).
"""
import os
import sys

ROOT = os.getcwd()
FE = os.path.join(ROOT, "frontend")
FS = os.path.join(FE, "src")

EDITS = []  # list of (path, old, new, label)

def add(rel_path, old, new, label):
    EDITS.append((os.path.join(ROOT, rel_path), old, new, label))


# ── App.jsx ──────────────────────────────────────────────────────────
add("frontend/src/App.jsx",
    "  }, [isAuthenticated]);",
    "  }, [isAuthenticated, fetchCart, fetchWishlist, clearWishlist]);",
    "App.jsx: exhaustive-deps")

# ── AdminSidebar.jsx ─────────────────────────────────────────────────
add("frontend/src/components/admin/AdminSidebar.jsx",
    "    try { await authService.logout() } catch {}",
    "    try {\n      await authService.logout()\n    } catch {\n      "
    "// Server-side logout failing shouldn't block local logout — ignore\n    }",
    "AdminSidebar.jsx: empty catch")

# ── DealTimer.jsx (full rewrite — Box moved outside) ────────────────
DEALTIMER_OLD = '''import { useState, useEffect } from "react";

function pad(n) { return String(n).padStart(2, "0"); }

export default function DealTimer({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(endsAt) - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const Box = ({ val, label }) => (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center
                      justify-center text-xl font-bold font-mono">
        {pad(val)}
      </div>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );

  return (
    <div className="flex items-end gap-2">
      <Box val={timeLeft.h} label="HRS" />
      <span className="text-gray-900 font-bold text-xl mb-3">:</span>
      <Box val={timeLeft.m} label="MIN" />
      <span className="text-gray-900 font-bold text-xl mb-3">:</span>
      <Box val={timeLeft.s} label="SEC" />
    </div>
  );
}'''

DEALTIMER_NEW = '''import { useState, useEffect } from "react";

function pad(n) { return String(n).padStart(2, "0"); }

function Box({ val, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center
                      justify-center text-xl font-bold font-mono">
        {pad(val)}
      </div>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

export default function DealTimer({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(endsAt) - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex items-end gap-2">
      <Box val={timeLeft.h} label="HRS" />
      <span className="text-gray-900 font-bold text-xl mb-3">:</span>
      <Box val={timeLeft.m} label="MIN" />
      <span className="text-gray-900 font-bold text-xl mb-3">:</span>
      <Box val={timeLeft.s} label="SEC" />
    </div>
  );
}'''

add("frontend/src/components/common/DealTimer.jsx", DEALTIMER_OLD, DEALTIMER_NEW,
    "DealTimer.jsx: move Box outside render")

# ── Footer.jsx / Navbar.jsx — unused imports ────────────────────────
add("frontend/src/components/common/Footer.jsx",
    'import { Package, Mail, Phone, ExternalLink } from "lucide-react";',
    'import { Package, Mail, Phone } from "lucide-react";',
    "Footer.jsx: unused ExternalLink")

add("frontend/src/components/common/Navbar.jsx",
    'import { clsx } from "clsx";\n',
    '',
    "Navbar.jsx: unused clsx")

# ── PWAInstallPrompt.jsx ─────────────────────────────────────────────
PWA_OLD = '''export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    // Android/Desktop install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show after 5 seconds if not dismissed before
    if (ios && !localStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])'''

PWA_NEW = '''export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS] = useState(() => /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()))
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  )

  useEffect(() => {
    if (isInstalled) return

    // Android/Desktop install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS: show after 5 seconds if not dismissed before
    if (isIOS && !localStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isIOS, isInstalled])'''

add("frontend/src/components/common/PWAInstallPrompt.jsx", PWA_OLD, PWA_NEW,
    "PWAInstallPrompt.jsx: set-state-in-effect")

# ── SearchBar.jsx ────────────────────────────────────────────────────
add("frontend/src/components/common/SearchBar.jsx",
    '''  // Debounced search for suggestions
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      if (suggestions.length > 0) setSuggestions([]);
      if (showDropdown) setShowDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {''',
    '''  // Debounced search for suggestions
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const handler = setTimeout(async () => {''',
    "SearchBar.jsx: set-state-in-effect")

# ── ProductFilters.jsx / ProductGrid.jsx / ProductReviews.jsx ──────
add("frontend/src/components/product/ProductFilters.jsx",
    'import { ChevronDown, ChevronUp, X, SlidersHorizontal } from "lucide-react";',
    'import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";',
    "ProductFilters.jsx: unused X")

add("frontend/src/components/product/ProductGrid.jsx",
    'import { LayoutGrid, List } from "lucide-react";\nimport { clsx } from "clsx";',
    'import { clsx } from "clsx";',
    "ProductGrid.jsx: unused LayoutGrid/List")

add("frontend/src/components/product/ProductReviews.jsx",
    'import { ThumbsUp, Star } from "lucide-react";\nimport { clsx } from "clsx";',
    'import { ThumbsUp, Star } from "lucide-react";',
    "ProductReviews.jsx: unused clsx")

add("frontend/src/components/product/ProductReviews.jsx",
    "export default function ProductReviews({ productId, ratings = 4.2, totalReviews = 128 }) {",
    "export default function ProductReviews({ ratings = 4.2, totalReviews = 128 }) {",
    "ProductReviews.jsx: unused productId")

# ── Analytics.jsx ────────────────────────────────────────────────────
add("frontend/src/pages/admin/Analytics.jsx",
    "import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'",
    "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'",
    "Analytics.jsx: unused LineChart/Line")

# ── EditProduct.jsx ──────────────────────────────────────────────────
add("frontend/src/pages/admin/EditProduct.jsx",
    "import { useState, useEffect } from 'react'",
    "import { useState } from 'react'",
    "EditProduct.jsx: unused useEffect")

add("frontend/src/pages/admin/EditProduct.jsx",
    "  const { data: product, isLoading } = useQuery({",
    "  const { isLoading } = useQuery({",
    "EditProduct.jsx: unused product")

add("frontend/src/pages/admin/EditProduct.jsx",
    "  const { data: catData } = useQuery({ queryKey:['categories'], "
    "queryFn: ()=>api.get('/categories').then(r=>r.data?.data?.categories||[]) })\n\n  const handleSubmit = (e) => {",
    "  const handleSubmit = (e) => {",
    "EditProduct.jsx: unused catData query")

# ── Products.jsx (admin) — wire up real pagination ──────────────────
add("frontend/src/pages/admin/Products.jsx",
    "import DataTable from '../../components/admin/DataTable'",
    "import DataTable from '../../components/admin/DataTable'\nimport Pagination from '../../components/ui/Pagination'",
    "Products.jsx: import Pagination")

add("frontend/src/pages/admin/Products.jsx",
    "        )}\n      />\n    </AdminLayout>",
    "        )}\n      />\n      <Pagination\n        page={page}\n        "
    "totalPages={data?.pagination?.totalPages || 1}\n        onPageChange={setPage}\n      "
    "/>\n    </AdminLayout>",
    "Products.jsx: wire setPage via Pagination")

# ── Settings.jsx — wire loadingSettings into Save button ────────────
add("frontend/src/pages/admin/Settings.jsx",
    "          disabled={mutation.isPending}",
    "          disabled={mutation.isPending || loadingSettings}",
    "Settings.jsx: wire loadingSettings")

# ── Register.jsx ─────────────────────────────────────────────────────
add("frontend/src/pages/auth/Register.jsx",
    "      const { confirmPassword, ...payload } = data;",
    "      const payload = { ...data };\n      delete payload.confirmPassword;",
    "Register.jsx: unused confirmPassword")

# ── VerifyOTP.jsx ─────────────────────────────────────────────────────
add("frontend/src/pages/auth/VerifyOTP.jsx",
    "    } catch (err) {\n      toast.error(\"Resend failed. Try again.\");",
    "    } catch {\n      toast.error(\"Resend failed. Try again.\");",
    "VerifyOTP.jsx: unused err")

# ── OrderSuccess.jsx ─────────────────────────────────────────────────
add("frontend/src/pages/customer/OrderSuccess.jsx",
    'import { CheckCircle, Package, Home, ShoppingBag, Copy, AlertCircle } from "lucide-react";',
    'import { CheckCircle, Package, Home, ShoppingBag, Copy } from "lucide-react";',
    "OrderSuccess.jsx: unused AlertCircle")

add("frontend/src/pages/customer/OrderSuccess.jsx",
    '''      });
    } catch {}
  }, []);''',
    '''      });
    } catch {
      // canvas-confetti is a non-critical visual flourish — ignore load/play failures
    }
  }, [orderId, orderNumber]);''',
    "OrderSuccess.jsx: empty catch + exhaustive-deps")

# ── ProductDetail.jsx ────────────────────────────────────────────────
add("frontend/src/pages/customer/ProductDetail.jsx",
    'import { useState, useEffect } from "react";',
    'import { useState } from "react";',
    "ProductDetail.jsx: unused useEffect")

add("frontend/src/pages/customer/ProductDetail.jsx",
    '''import {
  Heart, ShoppingCart, Zap, Share2, Shield,
  Truck, RefreshCw, Star, Check, Package, AlertCircle
} from "lucide-react";''',
    '''import {
  Heart, ShoppingCart, Zap, Share2, Shield,
  Truck, RefreshCw, Check, AlertCircle
} from "lucide-react";''',
    "ProductDetail.jsx: unused Star/Package")

add("frontend/src/pages/customer/ProductDetail.jsx",
    'import ProductCard from "../../components/product/ProductCard";\n'
    'import { ProductCardSkeleton } from "../../components/ui/Skeleton";',
    'import ProductCard from "../../components/product/ProductCard";',
    "ProductDetail.jsx: unused ProductCardSkeleton")

add("frontend/src/pages/customer/ProductDetail.jsx",
    '''  const relatedProducts = (relatedData || []).filter(p => p._id !== product?._id).slice(0, 4);

  // Set default color/size when product loads
  useEffect(() => {
    if (product?.colors?.length > 0) setSelectedColor(product.colors[0].name);
    if (product?.sizes?.length > 0)  setSelectedSize(product.sizes[0]);
  }, [product]);''',
    '''  const relatedProducts = (relatedData || []).filter(p => p._id !== product?._id).slice(0, 4);

  // Default to the product's first color/size until the user picks one —
  // derived at render time instead of set in an effect, since it's a pure
  // function of `product` + user selection.
  const displayedColor = selectedColor || product?.colors?.[0]?.name || "";
  const displayedSize  = selectedSize  || product?.sizes?.[0]        || "";''',
    "ProductDetail.jsx: set-state-in-effect -> derived defaults")

add("frontend/src/pages/customer/ProductDetail.jsx",
    "      await addItem({ ...product, quantity: qty, variant: selectedColor || selectedSize || null });",
    "      await addItem({ ...product, quantity: qty, variant: displayedColor || displayedSize || null });",
    "ProductDetail.jsx: use displayedColor/Size in addItem")

add("frontend/src/pages/customer/ProductDetail.jsx",
    '''          {product.colors?.length > 0 && (
            <ColorVariant colors={product.colors} selected={selectedColor} onChange={setSelectedColor} />
          )}
          {product.sizes?.length > 0 && (
            <SizeVariant sizes={product.sizes} selected={selectedSize} onChange={setSelectedSize} />
          )}''',
    '''          {product.colors?.length > 0 && (
            <ColorVariant colors={product.colors} selected={displayedColor} onChange={setSelectedColor} />
          )}
          {product.sizes?.length > 0 && (
            <SizeVariant sizes={product.sizes} selected={displayedSize} onChange={setSelectedSize} />
          )}''',
    "ProductDetail.jsx: use displayedColor/Size in variant pickers")

# ── ProductListing.jsx — real error state ───────────────────────────
add("frontend/src/pages/customer/ProductListing.jsx",
    "  const { data, isLoading, isError } = useQuery({",
    "  const { data, isLoading, isError, refetch } = useQuery({",
    "ProductListing.jsx: add refetch")

add("frontend/src/pages/customer/ProductListing.jsx",
    '''        {/* Product Grid */}
        <main className="flex-1 min-w-0">
          {!isLoading && products.length === 0 ? (''',
    '''        {/* Product Grid */}
        <main className="flex-1 min-w-0">
          {isError ? (
            <div className="py-20">
              <EmptyState
                title="Couldn't load products"
                description="Something went wrong fetching products. Please try again."
                buttonText="Retry"
                onButtonClick={refetch}
              />
            </div>
          ) : !isLoading && products.length === 0 ? (''',
    "ProductListing.jsx: wire isError to real error UI")

# ── Wishlist.jsx — REAL BUG FIX ──────────────────────────────────────
add("frontend/src/pages/customer/Wishlist.jsx",
    "  const addToCart = useCartStore(s => s.addItem)\n"
    "  const removeFromWishlist = useWishlistStore(s => s.removeItem)",
    "  const addToCart = useCartStore(s => s.addItem)",
    "Wishlist.jsx: FIX real bug — useWishlistStore was never imported")

# ── auth.service.js — duplicate keys ────────────────────────────────
add("frontend/src/services/auth.service.js",
    '''  verifyOtp:      (data) => api.post("/auth/verify-otp", data),
  verifyEmail:    (data) => api.post("/auth/verify-email", data),
  verifyEmail:    (data) => api.post("/auth/verify-email", data),
  resetPassword:  (data) => api.post("/auth/reset-password", data),
  sendOtp:        (data) => api.post("/auth/send-otp", data),
  verifyEmail:    (data) => api.post("/auth/verify-email", data),
  getMe:          ()     => api.get("/auth/me"),''',
    '''  verifyOtp:      (data) => api.post("/auth/verify-otp", data),
  verifyEmail:    (data) => api.post("/auth/verify-email", data),
  resetPassword:  (data) => api.post("/auth/reset-password", data),
  sendOtp:        (data) => api.post("/auth/send-otp", data),
  getMe:          ()     => api.get("/auth/me"),''',
    "auth.service.js: duplicate verifyEmail keys")

# ── tailwind.config.js — require() -> ESM import ────────────────────
add("frontend/tailwind.config.js",
    "/** @type {import('tailwindcss').Config} */\nexport default {",
    'import forms from "@tailwindcss/forms";\nimport aspectRatio from "@tailwindcss/aspect-ratio";\n\n'
    "/** @type {import('tailwindcss').Config} */\nexport default {",
    "tailwind.config.js: add ESM imports")

add("frontend/tailwind.config.js",
    '''  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
  ],
};''',
    '''  plugins: [
    forms,
    aspectRatio,
  ],
};''',
    "tailwind.config.js: use imported plugins")


def main():
    if not os.path.isdir(FS):
        print(f"[ERROR] {FS} not found. Run this script from the repo root "
              f"(the folder that contains 'frontend/' and 'backend/').")
        sys.exit(1)

    applied, skipped, missing = 0, 0, 0
    for path, old, new, label in EDITS:
        if not os.path.isfile(path):
            print(f"[WARN] {label} — file not found: {path}")
            missing += 1
            continue
        with open(path, "r") as f:
            content = f.read()

        # Classify the edit so we check the right signal for "already applied":
        #   subtractive (new == "" or new is a substring of old, e.g. removing
        #   one of two import lines) -> the reliable signal is that the full
        #   `old` block is gone.
        #   additive/disjoint (new is not a substring of old, e.g. inserting
        #   a new import line above an existing one, or a full block rewrite)
        #   -> the reliable signal is that `new` is present. Checking `old`
        #   here would misfire when `old` still exists as a literal substring
        #   inside the now-inserted `new` text.
        is_subtractive = (new == "" or new in old)

        if is_subtractive:
            if old not in content:
                print(f"[skip] {label} — already applied")
                skipped += 1
                continue
        else:
            if new in content:
                print(f"[skip] {label} — already applied")
                skipped += 1
                continue
            if old not in content:
                print(f"[WARN] {label} — target text not found, skipping "
                      f"(file may have changed; check manually)")
                missing += 1
                continue

        content = content.replace(old, new, 1)
        with open(path, "w") as f:
            f.write(content)
        print(f"[OK] {label}")
        applied += 1

    print(f"\n{applied} applied, {skipped} already-applied, {missing} skipped/warned.")
    print("\nNow verify with:")
    print("  cd frontend")
    print("  npx eslint .        # should print nothing (zero problems)")
    print("  npm run build       # should succeed")


if __name__ == "__main__":
    main()

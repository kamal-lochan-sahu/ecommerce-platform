#!/usr/bin/env python3
"""
Phase 4(c) — Per-query staleTime for notifications / orders

Run this from the root of your ecommerce-platform repo:
    python3 phase4c_query_staletime.py

Context: cart is NOT a react-query — it's Zustand-managed
(useCartStore.fetchCart()) called explicitly on app load + after login,
so react-query staleTime doesn't apply to it; that part is already
correct as-is. The real gap was Notifications and OrderHistory both
silently inheriting the global 2-min default staleTime from App.jsx,
which is too stale for notifications in particular.

What it does:
  1. Notifications.jsx  → staleTime: 30s + refetchInterval: 30s
     (notifications should feel close to live)
  2. OrderHistory.jsx   → staleTime: 30s
     (order status can change — shipped/delivered — and the list
     shouldn't sit stale for up to 2 minutes)
  3. App.jsx            → updates the stale comment above queryClient
     to reflect the real architecture (cart = Zustand, not react-query)

Safe to re-run: skips a file if the target string isn't found (already
patched) instead of crashing.
"""
import os
import sys

ROOT = os.getcwd()
FRONTEND_SRC = os.path.join(ROOT, "frontend", "src")

APP_JSX = os.path.join(FRONTEND_SRC, "App.jsx")
NOTIFICATIONS_JSX = os.path.join(FRONTEND_SRC, "pages", "customer", "Notifications.jsx")
ORDER_HISTORY_JSX = os.path.join(FRONTEND_SRC, "pages", "customer", "OrderHistory.jsx")


def patch_app_jsx():
    with open(APP_JSX, "r") as f:
        content = f.read()

    old = "// Per-query staleTime set karenge — blanket 5min too coarse for cart/orders"
    new = (
        "// Global default below is a reasonable baseline for most reads (products,\n"
        "// categories). Cart is Zustand-managed (useCartStore.fetchCart(), called on\n"
        "// app load + after login) so it doesn't go through react-query at all.\n"
        "// Notifications and OrderHistory override staleTime individually — see\n"
        "// their useQuery calls — since they need to feel fresher than 2 min."
    )
    if old not in content:
        print("[skip] App.jsx comment already updated or not found")
        return
    content = content.replace(old, new, 1)
    with open(APP_JSX, "w") as f:
        f.write(content)
    print(f"[OK] patched {APP_JSX}")


def patch_notifications():
    with open(NOTIFICATIONS_JSX, "r") as f:
        content = f.read()

    old = (
        "  const { data, isLoading } = useQuery({\n"
        "    queryKey: ['notifications'],\n"
        "    queryFn: () => notificationService.getAll().then(r => r.data?.data?.notifications || r.data?.notifications || []),\n"
        "  })"
    )
    new = (
        "  const { data, isLoading } = useQuery({\n"
        "    queryKey: ['notifications'],\n"
        "    queryFn: () => notificationService.getAll().then(r => r.data?.data?.notifications || r.data?.notifications || []),\n"
        "    staleTime: 1000 * 30,      // 30s — notifications should feel close to live\n"
        "    refetchInterval: 1000 * 30, // poll while the page is open\n"
        "  })"
    )
    if old not in content:
        print("[skip] Notifications.jsx useQuery block not found or already patched")
        return
    content = content.replace(old, new, 1)
    with open(NOTIFICATIONS_JSX, "w") as f:
        f.write(content)
    print(f"[OK] patched {NOTIFICATIONS_JSX}")


def patch_order_history():
    with open(ORDER_HISTORY_JSX, "r") as f:
        content = f.read()

    old = (
        "  const { data, isLoading, isError, refetch } = useQuery({\n"
        "    queryKey: ['orders', activeStatus, page],\n"
        "    queryFn: () =>\n"
        "      orderService.getAll({ status: activeStatus, page, limit: 8 }),\n"
        "  })"
    )
    new = (
        "  const { data, isLoading, isError, refetch } = useQuery({\n"
        "    queryKey: ['orders', activeStatus, page],\n"
        "    queryFn: () =>\n"
        "      orderService.getAll({ status: activeStatus, page, limit: 8 }),\n"
        "    staleTime: 1000 * 30, // 30s — order status (shipped/delivered) can change\n"
        "  })"
    )
    if old not in content:
        print("[skip] OrderHistory.jsx useQuery block not found or already patched")
        return
    content = content.replace(old, new, 1)
    with open(ORDER_HISTORY_JSX, "w") as f:
        f.write(content)
    print(f"[OK] patched {ORDER_HISTORY_JSX}")


def main():
    if not os.path.isdir(FRONTEND_SRC):
        print(f"[ERROR] {FRONTEND_SRC} not found. Run this script from the repo root "
              f"(the folder that contains 'frontend/' and 'backend/').")
        sys.exit(1)

    patch_app_jsx()
    patch_notifications()
    patch_order_history()

    print("\nDone. Now verify with:")
    print("  git diff frontend/src/App.jsx")
    print("  git diff frontend/src/pages/customer/Notifications.jsx")
    print("  git diff frontend/src/pages/customer/OrderHistory.jsx")


if __name__ == "__main__":
    main()

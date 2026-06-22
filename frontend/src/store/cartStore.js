import { create } from "zustand";
import { persist } from "zustand/middleware";
import cartService from "../services/cart.service";
import toast from "react-hot-toast";

// Guest session ID — UUID stored in localStorage (not auth-related, safe)
export const getSessionId = () => {
  let sid = localStorage.getItem("x-session-id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("x-session-id", sid);
  }
  return sid;
};

// Initialize session ID on load
getSessionId();

// Transform server cart items → frontend format
const transformItems = (serverItems = []) =>
  serverItems
    .filter((item) => item.product) // skip orphan items
    .map((item) => ({
      _id:          item.product._id,
      name:         item.product.name,
      slug:         item.product.slug,
      price:        item.price,
      comparePrice: item.product.comparePrice,
      images:       item.product.images,
      stock:        item.product.stock,
      quantity:     item.quantity,
      variant:      item.variant?._id || null,
    }));

const useCartStore = create(
  persist(
    (set, get) => ({
      items:       [],
      totalAmount: 0,
      totalItems:  0,
      isOpen:      false,
      loading:     false,

      // ── Internal recalc (for optimistic updates) ──
      _recalc: () => {
        const items = get().items;
        set({
          totalItems:  items.reduce((s, i) => s + i.quantity, 0),
          totalAmount: items.reduce((s, i) => s + i.price * i.quantity, 0),
        });
      },

      // ── Fetch cart from server (call on app load + after login) ──
      fetchCart: async () => {
        try {
          const res  = await cartService.getCart();
          const data = res.data?.data;
          if (data?.cart?.items?.length) {
            const items = transformItems(data.cart.items);
            set({
              items,
              totalAmount: data.totalAmount || 0,
              totalItems:  data.totalItems  || 0,
            });
          } else {
            set({ items: [], totalAmount: 0, totalItems: 0 });
          }
        } catch {
          // Silent fail — keep local state intact
        }
      },

      // ── Add item (optimistic + server sync) ──
      addItem: async (product) => {
        const prevItems = get().items;
        const exists = prevItems.find(
          (i) => i._id === product._id && i.variant === (product.variant || null)
        );
        if (exists) {
          set({
            items: prevItems.map((i) =>
              i._id === product._id && i.variant === (product.variant || null)
                ? { ...i, quantity: i.quantity + (product.quantity || 1) }
                : i
            ),
          });
        } else {
          set({ items: [...prevItems, { ...product, quantity: product.quantity || 1 }] });
        }
        get()._recalc();

        try {
          await cartService.addToCart({
            productId: product._id,
            variantId: product.variant || undefined,
            quantity:  product.quantity || 1,
          });
        } catch (err) {
          // Revert on failure
          set({ items: prevItems });
          get()._recalc();
          toast.error(err.response?.data?.message || "Could not add to cart");
        }
      },

      // ── Remove item (optimistic + server sync) ──
      removeItem: async (id, variant = null) => {
        const prevItems = get().items;
        set({ items: prevItems.filter((i) => !(i._id === id && i.variant === variant)) });
        get()._recalc();

        try {
          await cartService.removeItem({ productId: id, variantId: variant || undefined });
        } catch {
          set({ items: prevItems });
          get()._recalc();
          toast.error("Could not remove item");
        }
      },

      // ── Update quantity (optimistic + server sync) ──
      updateQty: async (id, variant = null, qty) => {
        if (qty < 1) return get().removeItem(id, variant);
        const prevItems = get().items;
        set({
          items: prevItems.map((i) =>
            i._id === id && i.variant === variant ? { ...i, quantity: qty } : i
          ),
        });
        get()._recalc();

        try {
          await cartService.updateItem({
            productId: id,
            variantId: variant || undefined,
            quantity:  qty,
          });
        } catch {
          set({ items: prevItems });
          get()._recalc();
          toast.error("Could not update cart");
        }
      },

      // ── Clear cart ──
      clearCart: async (syncServer = true) => {
        set({ items: [], totalAmount: 0, totalItems: 0 });
        if (syncServer) {
          try { await cartService.clearCart(); } catch { /* silent */ }
        }
      },

      // ── Merge guest cart after login ──
      mergeGuestCart: async () => {
        try {
          await cartService.mergeCart();
          await get().fetchCart();
        } catch { /* silent */ }
      },

      // ── Drawer controls ──
      openCart:   () => set({ isOpen: true }),
      closeCart:  () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name:        "cart-storage",
      // Only persist UI-visible state; server is source of truth for items
      partialize: (s) => ({
        items:       s.items,
        totalAmount: s.totalAmount,
        totalItems:  s.totalItems,
      }),
    }
  )
);

export default useCartStore;

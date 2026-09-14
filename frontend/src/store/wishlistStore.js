import { create } from "zustand";
import wishlistService from "../services/wishlist.service";
import toast from "react-hot-toast";

/**
 * Server-backed wishlist store.
 * Optimistic updates with server sync — same pattern as cartStore.
 * No localStorage persistence — server is source of truth.
 */
const useWishlistStore = create((set, get) => ({
  items:   [],
  loading: false,

  // ── Fetch from server (call on login / app init) ──
  fetchWishlist: async () => {
    try {
      const res  = await wishlistService.getWishlist();
      const data = res.data?.data;
      const items = (data?.items || data?.products || []).map(i => i.product || i);
      set({ items: items.filter(Boolean) });
    } catch {
      // Silent — user may not be logged in
    }
  },

  // ── Add item ──
  addItem: async (product) => {
    const prev = get().items;
    if (get().isInWishlist(product._id)) return;
    set({ items: [...prev, product] });
    try {
      await wishlistService.addToWishlist({ productId: product._id });
    } catch {
      set({ items: prev });
      toast.error("Could not add to wishlist");
    }
  },

  // ── Remove item ──
  removeItem: async (id) => {
    const prev = get().items;
    set({ items: prev.filter(i => i._id !== id) });
    try {
      await wishlistService.removeFromWishlist({ productId: id });
    } catch {
      set({ items: prev });
      toast.error("Could not remove from wishlist");
    }
  },

  // ── Toggle (used in ProductCard / ProductDetail) ──
  toggleItem: (product) => {
    if (get().isInWishlist(product._id)) {
      get().removeItem(product._id);
    } else {
      get().addItem(product);
    }
  },

  // ── Clear (on logout) ──
  clearWishlist: () => set({ items: [] }),

  // ── Check ──
  isInWishlist: (id) => get().items.some(i => i._id === id),
}));

export default useWishlistStore;

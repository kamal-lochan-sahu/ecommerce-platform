import { create } from "zustand";
import { persist } from "zustand/middleware";

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem:      (p)  => { if (!get().isInWishlist(p._id)) set({ items: [...get().items, p] }); },
      removeItem:   (id) => set({ items: get().items.filter((i) => i._id !== id) }),
      isInWishlist: (id) => get().items.some((i) => i._id === id),
      toggleItem:   (p)  => get().isInWishlist(p._id) ? get().removeItem(p._id) : get().addItem(p),
    }),
    { name: "wishlist-storage" }
  )
);
export default useWishlistStore;

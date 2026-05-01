import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], totalAmount: 0, totalItems: 0, isOpen: false,
      _recalc: () => {
        const items = get().items;
        set({
          totalItems:  items.reduce((s, i) => s + i.quantity, 0),
          totalAmount: items.reduce((s, i) => s + i.price * i.quantity, 0),
        });
      },
      addItem: (product) => {
        const items = get().items;
        const exists = items.find((i) => i._id === product._id && i.variant === product.variant);
        if (exists) {
          set({ items: items.map((i) =>
            i._id === product._id && i.variant === product.variant
              ? { ...i, quantity: i.quantity + (product.quantity || 1) } : i) });
        } else {
          set({ items: [...items, { ...product, quantity: product.quantity || 1 }] });
        }
        get()._recalc();
      },
      removeItem: (id, variant) => {
        set({ items: get().items.filter((i) => !(i._id === id && i.variant === variant)) });
        get()._recalc();
      },
      updateQty: (id, variant, qty) => {
        if (qty < 1) return get().removeItem(id, variant);
        set({ items: get().items.map((i) =>
          i._id === id && i.variant === variant ? { ...i, quantity: qty } : i) });
        get()._recalc();
      },
      clearCart:  () => set({ items: [], totalAmount: 0, totalItems: 0 }),
      openCart:   () => set({ isOpen: true }),
      closeCart:  () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    { name: "cart-storage" }
  )
);
export default useCartStore;

import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUiStore = create(
  persist(
    (set) => ({
      theme: "light",
      searchOpen: false,
      toggleTheme: () => set((s) => {
        const next = s.theme === "light" ? "dark" : "light";
        document.documentElement.classList.toggle("dark", next === "dark");
        return { theme: next };
      }),
      toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
      closeSearch:  () => set({ searchOpen: false }),
    }),
    { name: "ui-storage", partialize: (s) => ({ theme: s.theme }) }
  )
);
export default useUiStore;

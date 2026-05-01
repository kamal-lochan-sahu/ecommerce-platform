import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      isAuthenticated: false,
      login:          (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      logout:         () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser:     (data) => set((s) => ({ user: { ...s.user, ...data } })),
      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: "auth-storage",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    }
  )
);
export default useAuthStore;

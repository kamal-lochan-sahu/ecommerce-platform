import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Security: accessToken is kept in memory only (NOT persisted to localStorage).
 * Only user info and isAuthenticated are persisted.
 * accessToken is restored via /auth/refresh on page load (handled in App.jsx).
 */
const useAuthStore = create(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null, // memory-only — intentionally not in partialize
      isAuthenticated: false,
      login:          (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      logout:         () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser:     (data) => set((s) => ({ user: { ...s.user, ...data } })),
      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: "auth-storage",
      // accessToken deliberately excluded — memory-only for XSS protection
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);

export default useAuthStore;

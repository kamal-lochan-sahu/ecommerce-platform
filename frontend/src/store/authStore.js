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
      // true only right after the person pressed Logout / deleted their account.
      // Memory-only. ProtectedRoute uses it to go HOME instead of remembering the page.
      loggedOutByUser: false,
      login:          (user, accessToken) => set({ user, accessToken, isAuthenticated: true, loggedOutByUser: false }),
      // logout(): session ended for any reason (expired, refresh failed)
      logout:         () => set({ user: null, accessToken: null, isAuthenticated: false }),
      // signOut(): the person chose to leave - use this from Logout / Delete account buttons
      signOut:        () => set({ user: null, accessToken: null, isAuthenticated: false, loggedOutByUser: true }),
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

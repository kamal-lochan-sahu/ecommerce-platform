import axios from "axios";
import { config } from "../config";
import useAuthStore from "../store/authStore";

const api = axios.create({
  baseURL: config.apiUrl,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((req) => {
  const token = useAuthStore.getState().accessToken;
  if (token) req.headers.Authorization = `Bearer ${token}`;
  // Guest cart session ID
  const sessionId = localStorage.getItem("x-session-id");
  if (sessionId) req.headers["x-session-id"] = sessionId;
  return req;
});

// These endpoints return 401 for reasons that have nothing to do with an expired
// session (wrong password, bad/expired refresh cookie). Trying to "refresh and
// retry" on them used to deadlock: the inner /auth/refresh 401 re-entered this
// interceptor, waited forever on the queue, and left the login button spinning
// with no error toast.
const isAuthEndpoint = (url = "") =>
  /\/auth\/(login|register|refresh|forgot-password|reset-password|send-otp|verify-otp)/.test(url);

// ONE in-flight refresh shared by everyone (the 401 interceptor AND the
// on-load session restore in App.jsx). Refresh tokens are rotated server-side,
// so two parallel refreshes with the same cookie make the second one fail.
let refreshPromise = null;
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .then((res) => {
        // Backend wraps responses as { success, statusCode, data, message } -
        // accessToken lives at res.data.data.accessToken.
        const { accessToken } = res.data.data;
        useAuthStore.getState().setAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

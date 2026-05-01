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
  return req;
});

let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const res = await api.post("/auth/refresh-token");
        const { accessToken } = res.data;
        useAuthStore.getState().setAccessToken(accessToken);
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

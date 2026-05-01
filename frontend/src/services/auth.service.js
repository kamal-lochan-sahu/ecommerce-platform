import api from "./api";

const authService = {
  login:         (data) => api.post("/auth/login", data),
  register:      (data) => api.post("/auth/register", data),
  logout:        ()     => api.post("/auth/logout"),
  forgotPassword:(data) => api.post("/auth/forgot-password", data),
  verifyOTP:     (data) => api.post("/auth/verify-otp", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  resendOTP:     (data) => api.post("/auth/resend-otp", data),
  getProfile:    ()     => api.get("/auth/profile"),
};

export default authService;

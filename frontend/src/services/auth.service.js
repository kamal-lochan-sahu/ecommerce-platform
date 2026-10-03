import api from "./api";

const authService = {
  login:          (data) => api.post("/auth/login", data),
  register:       (data) => api.post("/auth/register", data),
  logout:         ()     => api.post("/auth/logout"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  verifyOtp:      (data) => api.post("/auth/verify-otp", data),
  verifyEmail:    (data) => api.post("/auth/verify-email", data),
  resendVerification: ()  => api.post("/auth/resend-verification"),
  resetPassword:  (data) => api.post("/auth/reset-password", data),
  sendOtp:        (data) => api.post("/auth/send-otp", data),
  getMe:          ()     => api.get("/auth/me"),
};

export default authService;

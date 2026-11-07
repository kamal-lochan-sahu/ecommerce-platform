import api from "./api";

const userService = {
  getProfile:     ()       => api.get("/users/profile"),
  updateProfile:  (data)   => api.put("/users/profile", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  changePassword: (data)   => api.put("/users/change-password", data),
  deleteAccount:  (data)   => api.delete("/users/account", { data }),
  requestEmail:   (data)   => api.post("/users/email/request", data),
  verifyEmail:    (data)   => api.post("/users/email/verify", data),
  requestPhone:   (data)   => api.post("/users/phone/request", data),
  verifyPhone:    (data)   => api.post("/users/phone/verify", data),
  // Public: email ke link ka signed token (login nahi chahiye)
  unsubscribe:    (token)  => api.post("/users/unsubscribe", { token }),
};

export default userService;

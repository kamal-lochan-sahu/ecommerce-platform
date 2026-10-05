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
};

export default userService;

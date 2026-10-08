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
};

export default userService;

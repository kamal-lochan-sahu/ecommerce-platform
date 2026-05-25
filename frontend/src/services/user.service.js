import api from "./api";

const userService = {
  getProfile:     ()       => api.get("/users/profile"),
  updateProfile:  (data)   => api.put("/users/profile", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  changePassword: (data)   => api.put("/users/change-password", data),
  deleteAccount:  (data)   => api.delete("/users/account", { data }),
};

export default userService;

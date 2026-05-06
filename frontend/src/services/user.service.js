import api from "./api";
const userService = {
  getProfile:      ()     => api.get("/users/profile"),
  updateProfile:   (data) => api.put("/users/profile", data),
  updatePassword:  (data) => api.put("/users/change-password", data),
  uploadAvatar:    (form) => api.post("/users/avatar", form, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteAccount:   ()     => api.delete("/users/account"),
};
export default userService;

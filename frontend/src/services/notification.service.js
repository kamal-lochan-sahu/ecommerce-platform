import api from "./api";
const notificationService = {
  getAll:      (p)   => api.get("/notifications", { params: p }),
  markRead:    (id)  => api.put(`/notifications/${id}/read`),
  markAllRead: ()    => api.put("/notifications/read-all"),
  remove:      (id)  => api.delete(`/notifications/${id}`),
};
export default notificationService;

import api from "./api";

const wishlistService = {
  getAll:  ()    => api.get("/wishlist"),
  add:     (pid) => api.post("/wishlist/add", { productId: pid }),
  remove:  (pid) => api.delete("/wishlist/remove", { data: { productId: pid } }),
  check:   (pid) => api.get(`/wishlist/check/${pid}`),
  clear:   ()    => api.delete("/wishlist/clear"),
};

export default wishlistService;

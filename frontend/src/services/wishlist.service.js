import api from "./api";
const wishlistService = {
  getAll:  ()    => api.get("/wishlist"),
  add:     (pid) => api.post("/wishlist", { productId: pid }),
  remove:  (pid) => api.delete(`/wishlist/${pid}`),
};
export default wishlistService;

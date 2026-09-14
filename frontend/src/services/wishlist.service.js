import api from "./api";

const wishlistService = {
  getWishlist:         ()     => api.get("/wishlist"),
  addToWishlist:       (data) => api.post("/wishlist/add", data),
  removeFromWishlist:  (data) => api.delete("/wishlist/remove", { data }),
  clearWishlist:       ()     => api.delete("/wishlist/clear"),
};

export default wishlistService;

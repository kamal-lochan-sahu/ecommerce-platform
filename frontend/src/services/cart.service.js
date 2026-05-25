import api from "./api";

const cartService = {
  getCart:        ()       => api.get("/cart"),
  addToCart:      (data)   => api.post("/cart/add", data),
  updateItem:     (data)   => api.put("/cart/update", data),
  removeItem:     (data)   => api.delete("/cart/remove", { data }),
  clearCart:      ()       => api.delete("/cart/clear"),
  mergeCart:      ()       => api.post("/cart/merge"),
  applyCoupon:    (code)   => api.post("/cart/apply-coupon", { code }),
  removeCoupon:   ()       => api.delete("/cart/remove-coupon"),
  validateCoupon: (code)   => api.post("/coupons/validate", { code }),
};

export default cartService;

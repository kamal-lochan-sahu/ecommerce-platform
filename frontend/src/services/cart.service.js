import api from "./api";

const cartService = {
  getCart:       ()       => api.get("/cart"),
  applyCoupon:   (code)   => api.post("/cart/apply-coupon", { code }),
  removeCoupon:  ()       => api.delete("/cart/coupon"),
};

export default cartService;

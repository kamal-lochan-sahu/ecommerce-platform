import api from "./api";

const orderService = {
  create:     (data) => api.post("/orders", data),
  getAll:     (p)    => api.get("/orders", { params: p }),
  getById:    (id)   => api.get(`/orders/${id}`),
  cancelOrder:(id)   => api.patch(`/orders/${id}/cancel`),
  getTracking:(id)   => api.get(`/orders/${id}/tracking`),
  verifyPayment:(data)=> api.post("/orders/verify-payment", data),
};

export default orderService;

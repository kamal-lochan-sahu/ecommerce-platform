import api from "./api";

const orderService = {
  // Customer
  create:       (data) => api.post("/orders", data),
  getMyOrders:  (p)    => api.get("/orders", { params: p }),
  getById:      (id)   => api.get(`/orders/${id}`),
  cancel:       (id)   => api.put(`/orders/${id}/cancel`),
  getInvoice:   (id)   => api.get(`/orders/${id}/invoice`, { responseType: "blob" }),

  // Payment
  verifyRazorpay:     (data) => api.post("/orders/payments/razorpay/verify", data),
  createStripeSession:(data) => api.post("/orders/payments/stripe/create-session", data),

  // Admin
  adminGetAll:      (p)       => api.get("/orders/admin/all", { params: p }),
  adminUpdateStatus:(id, data)=> api.put(`/orders/admin/${id}/status`, data),
};

export default orderService;

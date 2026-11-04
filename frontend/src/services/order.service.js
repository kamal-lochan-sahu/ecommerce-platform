import api from "./api";

const orderService = {
  // Customer
  create:       (data) => api.post("/orders", data),
  getMyOrders:  (p)    => api.get("/orders", { params: p }),
  getById:      (id)   => api.get(`/orders/${id}`),
  cancel:       (id)   => api.put(`/orders/${id}/cancel`),
  getInvoice:   (id)   => api.get(`/orders/${id}/invoice`, { responseType: "blob" }),

  // Public tracking: order number + phone/email (login nahi chahiye)
  track: (orderNumber, contact) => api.post("/orders/track", { orderNumber, contact }),

  // Guest checkout: COD ke liye phone OTP (login nahi chahiye)
  guestSendOtp:   (phone)      => api.post("/orders/guest/send-otp", { phone }),
  guestVerifyOtp: (phone, otp) => api.post("/orders/guest/verify-otp", { phone, otp }),

  // Payment
  verifyRazorpay:     (data) => api.post("/orders/payments/razorpay/verify", data),
  createStripeSession:(data) => api.post("/orders/payments/stripe/create-session", data),

  // Admin
  adminGetAll:      (p)       => api.get("/orders/admin/all", { params: p }),
  adminUpdateStatus:(id, data)=> api.put(`/orders/admin/${id}/status`, data),
};

export default orderService;

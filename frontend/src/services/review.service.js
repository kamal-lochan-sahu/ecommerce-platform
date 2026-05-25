import api from "./api";

const reviewService = {
  getProductReviews: (productId, params) =>
    api.get(`/products/${productId}/reviews`, { params }),
  create: (productId, data) =>
    api.post(`/products/${productId}/reviews`, data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  remove: (id)       => api.delete(`/reviews/${id}`),
  markHelpful: (id)  => api.post(`/reviews/${id}/helpful`),
};

export default reviewService;

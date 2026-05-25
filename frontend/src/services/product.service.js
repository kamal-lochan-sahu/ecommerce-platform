import api from "./api";

const productService = {
  // Public
  getAll:      (params) => api.get("/products", { params }),
  getBySlug:   (slug)   => api.get(`/products/${slug}`),
  getFeatured: (limit=8)=> api.get("/products/featured", { params: { limit } }),
  search:      (params) => api.get("/products/search", { params }),
  getCategories: ()     => api.get("/categories"),
  getBanners:  (params) => api.get("/banners", { params }),

  // Admin
  adminGetAll:    (params) => api.get("/products", { params }),
  adminGetById:   (id)     => api.get(`/products/id/${id}`),
  adminCreate:    (data)   => api.post("/products", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  adminUpdate:    (id, data) => api.put(`/products/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  adminDelete:    (id)     => api.delete(`/products/${id}`),
};

export default productService;

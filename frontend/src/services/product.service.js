import api from "./api";

const productService = {
  getAll:      (params) => api.get("/products", { params }),
  getBySlug:   (slug)   => api.get(`/products/${slug}`),
  getFeatured: ()       => api.get("/products/featured"),
  getNewArrivals: ()    => api.get("/products/new-arrivals"),
  getDeals:    ()       => api.get("/products/deals"),
  getRelated:  (id)     => api.get(`/products/${id}/related`),
  getCategories: ()     => api.get("/categories"),
  getBanners:  ()       => api.get("/banners"),
};

export default productService;

import api from "./api";
const addressService = {
  getAll:     ()        => api.get("/addresses"),
  add:        (data)    => api.post("/addresses", data),
  update:     (id,data) => api.put(`/addresses/${id}`, data),
  remove:     (id)      => api.delete(`/addresses/${id}`),
  setDefault: (id)      => api.put(`/addresses/${id}/default`),
};
export default addressService;

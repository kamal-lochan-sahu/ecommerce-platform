import api from "./api";
const loyaltyService = {
  get:     ()  => api.get("/loyalty"),
  history: (p) => api.get("/loyalty/history", { params: p }),
};
export default loyaltyService;

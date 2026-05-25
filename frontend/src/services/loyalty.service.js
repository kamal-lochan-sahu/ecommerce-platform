import api from "./api";

// Note: No dedicated /loyalty endpoint exists in backend
// Loyalty points are stored in User model (loyaltyPoints field)
// History comes from notifications of type loyalty

const loyaltyService = {
  // Get loyalty points balance from user profile
  getBalance: () => api.get("/users/profile"),

  // Get loyalty points history from notifications
  getHistory: (params) => api.get("/notifications", {
    params: { ...params, type: "loyalty_points_earned" }
  }),
};

export default loyaltyService;

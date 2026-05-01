export const config = {
  apiUrl:         import.meta.env.VITE_API_URL         || "http://localhost:5000/api",
  clientName:     import.meta.env.VITE_CLIENT_NAME     || "MyShop",
  primaryColor:   import.meta.env.VITE_PRIMARY_COLOR   || "#6366f1",
  secondaryColor: import.meta.env.VITE_SECONDARY_COLOR || "#f59e0b",
  razorpayKeyId:  import.meta.env.VITE_RAZORPAY_KEY_ID || "",
};

export const applyTheme = () => {
  const root = document.documentElement;
  root.style.setProperty("--color-primary",   config.primaryColor);
  root.style.setProperty("--color-secondary", config.secondaryColor);
  document.title = config.clientName;
};

import { Suspense, lazy, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { applyTheme } from "./config";
import useAuthStore from "./store/authStore";
import useCartStore from "./store/cartStore";
import useWishlistStore from "./store/wishlistStore";
import useUiStore from "./store/uiStore";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import { ScrollToTopOnRoute, ScrollToTopButton } from "./components/common/ScrollToTop";
import CartDrawer from "./components/cart/CartDrawer";
import PWAInstallPrompt from './components/common/PWAInstallPrompt'

const Home           = lazy(() => import("./pages/customer/Home"));
const ProductListing = lazy(() => import("./pages/customer/ProductListing"));
const ProductDetail  = lazy(() => import("./pages/customer/ProductDetail"));
const Cart           = lazy(() => import("./pages/customer/Cart"));
const Checkout       = lazy(() => import("./pages/customer/Checkout"));
const OrderSuccess   = lazy(() => import("./pages/customer/OrderSuccess"));
const OrderHistory   = lazy(() => import("./pages/customer/OrderHistory"));
const OrderDetail    = lazy(() => import("./pages/customer/OrderDetail"));
const OrderTracking  = lazy(() => import("./pages/customer/OrderTracking"));
const Profile        = lazy(() => import("./pages/customer/Profile"));
const Addresses      = lazy(() => import("./pages/customer/Addresses"));
const Wishlist       = lazy(() => import("./pages/customer/Wishlist"));
const Notifications  = lazy(() => import("./pages/customer/Notifications"));
const LoyaltyPoints  = lazy(() => import("./pages/customer/LoyaltyPoints"));
const SearchResults  = lazy(() => import("./pages/customer/SearchResults"));
const Login          = lazy(() => import("./pages/auth/Login"));
const Register       = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword  = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyOTP      = lazy(() => import("./pages/auth/VerifyOTP"));
const AdminDashboard  = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts   = lazy(() => import("./pages/admin/Products"));
const AddProduct      = lazy(() => import("./pages/admin/AddProduct"));
const EditProduct     = lazy(() => import("./pages/admin/EditProduct"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminOrders     = lazy(() => import("./pages/admin/Orders"));
const AdminCustomers  = lazy(() => import("./pages/admin/Customers"));
const AdminReviews    = lazy(() => import("./pages/admin/Reviews"));
const AdminCoupons    = lazy(() => import("./pages/admin/Coupons"));
const AdminBanners    = lazy(() => import("./pages/admin/Banners"));
const AdminAnalytics  = lazy(() => import("./pages/admin/Analytics"));
const AdminSettings   = lazy(() => import("./pages/admin/Settings"));

// Global default below is a reasonable baseline for most reads (products,
// categories). Cart is Zustand-managed (useCartStore.fetchCart(), called on
// app load + after login) so it doesn't go through react-query at all.
// Notifications and OrderHistory override staleTime individually — see
// their useQuery calls — since they need to feel fresher than 2 min.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min default
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Global Error Boundary ──
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6 text-sm">
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  return isAuthenticated
    ? children
    : <Navigate to="/login" state={{ from: location }} replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
};

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppLayout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isAuth  = ["/login","/register","/forgot-password","/reset-password","/verify-otp"]
                    .includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && !isAuth && <Navbar />}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"                    element={<Home />} />
            <Route path="/products"            element={<ProductListing />} />
            <Route path="/products/:slug"      element={<ProductDetail />} />
            <Route path="/search"              element={<SearchResults />} />
            <Route path="/login"               element={<Login />} />
            <Route path="/register"            element={<Register />} />
            <Route path="/forgot-password"     element={<ForgotPassword />} />
            <Route path="/reset-password"      element={<ResetPassword />} />
            <Route path="/verify-otp"          element={<VerifyOTP />} />

            {/* Protected customer routes */}
            <Route path="/cart"          element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/checkout"      element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
            <Route path="/orders"        element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
            <Route path="/orders/:id"    element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/orders/:id/tracking" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
            <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/addresses"     element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
            <Route path="/wishlist"      element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/loyalty"       element={<ProtectedRoute><LoyaltyPoints /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin"                    element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/products"           element={<AdminRoute><AdminProducts /></AdminRoute>} />
            <Route path="/admin/products/add"       element={<AdminRoute><AddProduct /></AdminRoute>} />
            <Route path="/admin/products/:id/edit"  element={<AdminRoute><EditProduct /></AdminRoute>} />
            <Route path="/admin/categories"         element={<AdminRoute><AdminCategories /></AdminRoute>} />
            <Route path="/admin/orders"             element={<AdminRoute><AdminOrders /></AdminRoute>} />
            <Route path="/admin/customers"          element={<AdminRoute><AdminCustomers /></AdminRoute>} />
            <Route path="/admin/reviews"            element={<AdminRoute><AdminReviews /></AdminRoute>} />
            <Route path="/admin/coupons"            element={<AdminRoute><AdminCoupons /></AdminRoute>} />
            <Route path="/admin/banners"            element={<AdminRoute><AdminBanners /></AdminRoute>} />
            <Route path="/admin/analytics"          element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
            <Route path="/admin/settings"           element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && !isAuth && <Footer />}
      <CartDrawer />
      <ScrollToTopButton />
      <ScrollToTopOnRoute />
    </div>
  );
}

export default function App() {
  const { theme } = useUiStore();
  const { isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist, clearWishlist } = useWishlistStore();

  useEffect(() => {
    applyTheme();
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Sync cart + wishlist from server on auth state change
  useEffect(() => {
    fetchCart();
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      clearWishlist();
    }
  }, [isAuthenticated, fetchCart, fetchWishlist, clearWishlist]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout />
          <Toaster position={isMobile ? "top-center" : "top-right"} toastOptions={{
            duration: 3000,
            style: { borderRadius: "12px", fontFamily: "Inter, sans-serif", fontSize: "14px" },
          }} />
          <PWAInstallPrompt />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

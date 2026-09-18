import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Package, Home, ShoppingBag, Copy } from "lucide-react";
import useAuthStore from "../../store/authStore";
import orderService from "../../services/order.service";
import toast from "react-hot-toast";

export default function OrderSuccess() {
  const location            = useLocation();
  const navigate            = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Support both orderId (MongoDB _id) and orderNumber
  const orderId     = location.state?.orderId;
  const orderNumber = location.state?.orderNumber;

  // Redirect if accessed directly without order state
  useEffect(() => {
    if (!orderId && !orderNumber) {
      navigate("/", { replace: true });
    }
  }, [orderId, orderNumber, navigate]);

  // Fetch real order data
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-success", orderId],
    queryFn: () => orderId
      ? orderService.getById(orderId).then(r => r.data?.data?.order)
      : null,
    enabled: !!orderId && isAuthenticated,
    staleTime: Infinity,
    retry: 1,
  });

  // Confetti on mount
  useEffect(() => {
    if (!orderId && !orderNumber) return;
    try {
      import("canvas-confetti").then(m => {
        const confetti = m.default;
        const end = Date.now() + 2000;
        const colors = ["#6366f1", "#f59e0b", "#10b981"];
        (function frame() {
          confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      });
    } catch {
      // canvas-confetti is a non-critical visual flourish — ignore load/play failures
    }
  }, [orderId, orderNumber]);

  const displayOrderNumber = order?.orderNumber || orderNumber || "ORD-XXXXXX";

  const copyOrderId = () => {
    navigator.clipboard.writeText(displayOrderNumber);
    toast.success("Order ID copied! 📋");
  };

  if (!orderId && !orderNumber) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">

        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-xl">🎉</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed! 🛍️</h1>
        <p className="text-gray-600 mb-1">Your order has been confirmed.</p>
        <p className="text-gray-500 text-sm mb-6">You will receive a confirmation email shortly.</p>

        {/* Order ID Card */}
        <div className="card p-5 mb-4 text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Package size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Order ID</p>
                {isLoading ? (
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mt-1" />
                ) : (
                  <p className="font-bold text-gray-900 text-sm">{displayOrderNumber}</p>
                )}
              </div>
            </div>
            <button onClick={copyOrderId}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <Copy size={13} /> Copy
            </button>
          </div>

          {/* Order items summary if available */}
          {order?.items?.length > 0 && (
            <div className="border-t border-gray-100 pt-3 mt-2 space-y-2">
              {order.items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <img src={item.image || "https://placehold.co/40x40?text=P"} alt={item.name}
                    className="w-8 h-8 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
                  <span className="flex-1 text-gray-700 line-clamp-1">{item.name}</span>
                  <span className="text-gray-500 text-xs">×{item.quantity}</span>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-semibold text-gray-900">
                <span>Total Paid</span>
                <span>₹{order.pricing?.total?.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          {/* Delivery timeline */}
          <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
            {[
              { label: "Order Confirmed",  done: true,  time: "Just now"  },
              { label: "Processing",       done: false, time: "1-2 hours" },
              { label: "Shipped",          done: false, time: "1-2 days"  },
              { label: "Out for Delivery", done: false, time: "2-4 days"  },
              { label: "Delivered",        done: false, time: "3-5 days"  },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-green-500" : "bg-gray-100"}`}>
                  {s.done
                    ? <CheckCircle size={12} className="text-white" />
                    : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className={`text-sm ${s.done ? "font-semibold text-gray-900" : "text-gray-400"}`}>{s.label}</span>
                  <span className="text-xs text-gray-400">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isAuthenticated ? (
            <Link to="/orders" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <ShoppingBag size={18} /> View My Orders
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                Create Account — Save Orders
              </Link>
              <Link to="/login" className="btn-ghost w-full py-2.5 border border-gray-200 flex items-center justify-center gap-2 text-sm">
                Already have an account? Login
              </Link>
            </>
          )}
          <Link to="/" className="btn-ghost w-full py-3 border border-gray-200 flex items-center justify-center gap-2">
            <Home size={18} /> Continue Shopping
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">A confirmation email has been sent to you 📧</p>
      </div>
    </div>
  );
}

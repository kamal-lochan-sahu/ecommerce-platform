import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Package, ArrowRight, Home, ShoppingBag } from "lucide-react";
import confetti from "canvas-confetti";

export default function OrderSuccess() {
  const location = useLocation();
  const navigate  = useNavigate();
  const orderId   = location.state?.orderId || "ORD-XXXXXX";

  useEffect(() => {
    if (!location.state?.orderId) return;
    // Confetti! 🎉
    const end = Date.now() + 2000;
    const colors = ["#6366f1", "#f59e0b", "#10b981"];
    (function frame() {
      confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">

        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-100 rounded-full
                            flex items-center justify-center text-xl">
              🎉
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed! 🛍️</h1>
        <p className="text-gray-600 mb-1">Bahut accha! Tumhara order confirm ho gaya.</p>
        <p className="text-gray-500 text-sm mb-6">
          Jaldi deliver hoga — track karte rehna!
        </p>

        {/* Order ID Card */}
        <div className="card p-5 mb-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Order ID</p>
              <p className="font-bold text-gray-900 text-sm">{orderId}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {[
              { label: "Order Confirmed",     done: true,  time: "Just now"     },
              { label: "Processing",          done: false, time: "1-2 hours"    },
              { label: "Shipped",             done: false, time: "1-2 days"     },
              { label: "Out for Delivery",    done: false, time: "2-4 days"     },
              { label: "Delivered",           done: false, time: "3-5 days"     },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done ? "bg-green-500" : "bg-gray-100"
                }`}>
                  {step.done
                    ? <CheckCircle size={12} className="text-white" />
                    : <div className="w-2 h-2 rounded-full bg-gray-300" />
                  }
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className={`text-sm ${step.done ? "font-semibold text-gray-900" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-gray-400">{step.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            to="/orders"
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <ShoppingBag size={18} />
            View My Orders
          </Link>
          <Link
            to="/"
            className="btn-ghost w-full py-3 border border-gray-200 flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Continue Shopping
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Confirmation email bhej diya gaya hai 📧
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Tag, X, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import cartService from "../../services/cart.service";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";

export default function CartSummary({ subtotal, onCheckout, compact = false }) {
  const { user } = useAuthStore();
  const { couponCode, couponDiscount, setCoupon, clearCoupon } = useCartStore();
  const [couponInput, setCouponInput] = useState("");
  const [loading, setLoading] = useState(false);

  const discount = couponCode ? Math.min(couponDiscount, subtotal) : 0;
  const delivery = subtotal >= 499 ? 0 : 49;
  const total    = subtotal - discount + delivery;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (!user) {
      toast.error("Please login to apply a coupon");
      return;
    }
    setLoading(true);
    try {
      const res = await cartService.applyCoupon(couponInput.trim());
      const data = res.data?.data;
      setCoupon(data.couponCode, data.discount);
      toast.success(data.message || "Coupon applied!");
      setCouponInput("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid coupon code");
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = async () => {
    try { await cartService.removeCoupon(); } catch { /* still clear locally */ }
    clearCoupon();
    toast.success("Coupon removed");
  };

  return (
    <div className={clsx("space-y-4", !compact && "card p-5")}>
      {!couponCode ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && applyCoupon()} placeholder="Coupon code"
              className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase" />
          </div>
          <button onClick={applyCoupon} disabled={loading || !couponInput}
            className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-all">
            {loading ? "..." : "Apply"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">{couponCode}</span>
            <span className="text-xs text-green-600">−₹{discount.toLocaleString("en-IN")}</span>
          </div>
          <button onClick={removeCoupon} className="text-green-500 hover:text-green-700"><X size={15} /></button>
        </div>
      )}
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600 font-medium">
            <span>Discount</span><span>−₹{discount.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>Delivery</span>
          <span className={delivery === 0 ? "text-green-600 font-medium" : ""}>{delivery === 0 ? "FREE" : `₹${delivery}`}</span>
        </div>
        {delivery === 0 && <p className="text-xs text-green-600">🎉 Free delivery!</p>}
        {subtotal < 499 && delivery > 0 && <p className="text-xs text-gray-400">Add ₹{(499 - subtotal)} more for free delivery</p>}
        <p className="text-xs text-gray-400">+ tax, calculated at checkout</p>
        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2.5">
          <span>Total</span><span>₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>
      {onCheckout && (
        <button onClick={onCheckout} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
          Proceed to Checkout <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

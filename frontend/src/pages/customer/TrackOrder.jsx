import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PackageSearch, Truck, MapPin } from "lucide-react";
import Input from "../../components/ui/Input";
import OrderTimeline from "../../components/order/OrderTimeline";
import orderService from "../../services/order.service";
import usePageTitle from "../../hooks/usePageTitle";
import { onImageError } from "../../utils/imageFallback";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const when = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const PAYMENT_LABEL = { cod: "Cash on Delivery", razorpay: "Razorpay", stripe: "Card (Stripe)" };
// Courier ka link sirf http(s) ho tabhi button banta hai
const safeLink = (u) => (/^https?:\/\//i.test(u || "") ? u : null);

// Guest (ya login ke bina koi bhi) apna order order-number + phone/email se track kar sakta hai.
// Email/SMS ka link ?order=... se order number pehle se bhar deta hai.
export default function TrackOrder() {
  usePageTitle("Track Your Order");
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get("order") || "");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!orderNumber.trim() || !contact.trim()) {
      setError("Please enter your order number and the phone number or email used for the order.");
      return;
    }
    setLoading(true);
    try {
      const res = await orderService.track(orderNumber.trim(), contact.trim());
      setOrder(res?.data?.data?.order || null);
    } catch (err) {
      setOrder(null);
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (order) {
    const courierLink = safeLink(order.tracking?.trackingUrl);
    return (
      <div className="page-container max-w-2xl py-8">
        <div className="card p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-gray-400">Order</p>
              <h1 className="font-bold text-gray-900">{order.orderNumber}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Placed on {when(order.createdAt)}</p>
            </div>
            {order.expectedDelivery && !["delivered", "cancelled", "returned"].includes(order.orderStatus) && (
              <p className="text-xs text-gray-500 text-right">Expected delivery<br /><span className="font-semibold text-gray-800">{when(order.expectedDelivery)}</span></p>
            )}
          </div>
          <OrderTimeline status={order.orderStatus} statusHistory={order.statusHistory} />
          {(order.tracking?.courier || order.tracking?.trackingNumber) && (
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl mt-4 text-sm">
              <Truck className="text-indigo-500 flex-shrink-0" size={20} />
              <div className="flex-1 min-w-0">
                {order.tracking.courier && <p className="font-semibold text-gray-800">{order.tracking.courier}</p>}
                {order.tracking.trackingNumber && <p className="text-gray-500 font-mono text-xs mt-0.5">{order.tracking.trackingNumber}</p>}
              </div>
              {courierLink && (
                <a href={courierLink} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-semibold hover:underline">Track shipment →</a>
              )}
            </div>
          )}
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-sm mb-3">Items</h2>
          <div className="space-y-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                {it.image && <img onError={onImageError} src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />}
                <p className="flex-1 text-sm text-gray-800">{it.name}{it.variantLabel && <span className="text-gray-500"> ({it.variantLabel})</span>} <span className="text-gray-400">× {it.quantity}</span></p>
                <p className="text-sm font-medium">{money(it.price * it.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-3 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{money(order.pricing.subtotal)}</span></div>
            {order.pricing.couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{money(order.pricing.couponDiscount)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{order.pricing.shippingCharge > 0 ? money(order.pricing.shippingCharge) : "FREE"}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>{money(order.pricing.tax)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 pt-1"><span>Total</span><span>{money(order.pricing.total)}</span></div>
            <p className="text-xs text-gray-400 pt-1">
              {PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod} · {order.paymentStatus}
            </p>
          </div>
        </div>

        <div className="card p-5 mb-6 flex items-start gap-3">
          <MapPin size={16} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-gray-800">Delivering to</p>
            <p className="text-gray-500">{[order.shippingTo.city, order.shippingTo.state, order.shippingTo.pincode].filter(Boolean).join(", ")}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => { setOrder(null); setContact(""); }} className="btn-ghost border border-gray-200 px-5 py-2.5 flex-1">Track another order</button>
          <Link to="/register" className="btn-primary px-5 py-2.5 flex-1 text-center">Create an account to see all your orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-md py-12">
      <div className="text-center mb-6">
        <PackageSearch size={32} className="mx-auto text-primary mb-2" />
        <h1 className="text-xl font-bold text-gray-900">Track your order</h1>
        <p className="text-sm text-gray-500 mt-1">No account needed. Enter your order number and the phone number or email you used.</p>
      </div>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <Input label="Order number" placeholder="ORD-12345678-123" value={orderNumber} autoCapitalize="characters"
          onChange={(e) => setOrderNumber(e.target.value)} />
        <Input label="Phone number or email" placeholder="9876543210 or you@example.com" value={contact} autoFocus={!!params.get("order")}
          onChange={(e) => setContact(e.target.value)} />
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? "Checking…" : "Track order"}</button>
        <p className="text-xs text-gray-400 text-center">
          Have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link> to see all your orders.
        </p>
      </form>
    </div>
  );
}

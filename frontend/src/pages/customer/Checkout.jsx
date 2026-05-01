import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin, CreditCard, Smartphone, Truck,
  Check, ChevronRight, Lock
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import Input from "../../components/ui/Input";
import Breadcrumb from "../../components/common/Breadcrumb";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import orderService from "../../services/order.service";

const addressSchema = z.object({
  fullName:  z.string().min(2, "Name daalo"),
  phone:     z.string().regex(/^[6-9]\d{9}$/, "Valid phone number daalo"),
  pincode:   z.string().length(6, "6-digit pincode daalo"),
  address:   z.string().min(10, "Full address daalo"),
  city:      z.string().min(2, "City daalo"),
  state:     z.string().min(2, "State daalo"),
});

const PAYMENT_METHODS = [
  { id: "razorpay", label: "Razorpay",     sub: "UPI, Cards, Net Banking", icon: "💳" },
  { id: "cod",      label: "Cash on Delivery", sub: "Pay when you receive", icon: "💵" },
  { id: "stripe",   label: "Stripe",       sub: "International Cards",     icon: "🌐" },
];

const STEPS = ["Address", "Payment", "Review"];

export default function Checkout() {
  const navigate  = useNavigate();
  const { items, totalAmount, clearCart } = useCartStore();
  const { user }  = useAuthStore();
  const [step,    setStep]    = useState(0);
  const [payment, setPayment] = useState("razorpay");
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState(null);

  const delivery = totalAmount >= 499 ? 0 : 49;
  const total    = totalAmount + delivery;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: user?.name || "",
      phone:    user?.phone || "",
    },
  });

  const onAddressSubmit = (data) => {
    setAddress(data);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const orderData = {
        items: items.map(i => ({ product: i._id, quantity: i.quantity, variant: i.variant })),
        shippingAddress: address,
        paymentMethod: payment,
        totalAmount: total,
      };

      if (payment === "cod") {
        const res = await orderService.create(orderData);
        clearCart();
        toast.success("Order place ho gaya! 🎉");
        navigate("/order-success", { state: { orderId: res.data.order._id } });
      } else {
        // Mock for dev
        await new Promise(r => setTimeout(r, 1500));
        clearCart();
        toast.success("Order place ho gaya! 🎉");
        navigate("/order-success", { state: { orderId: "MOCK-ORDER-123" } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Order failed. Try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="page-container max-w-5xl">
      <Breadcrumb items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all",
              i < step  ? "bg-green-500 text-white"
              : i === step ? "bg-primary text-white"
              : "bg-gray-100 text-gray-400"
            )}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={clsx(
              "ml-2 text-sm font-medium",
              i === step ? "text-primary" : i < step ? "text-green-600" : "text-gray-400"
            )}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                "mx-3 h-px flex-1 w-12",
                i < step ? "bg-green-400" : "bg-gray-200"
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left — Steps Content */}
        <div className="lg:col-span-2">

          {/* STEP 0: Address */}
          {step === 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>
              <form onSubmit={handleSubmit(onAddressSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" placeholder="Kamal Sahu" required
                    error={errors.fullName?.message} {...register("fullName")} />
                  <Input label="Phone" type="tel" placeholder="9876543210" required
                    error={errors.phone?.message} {...register("phone")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Pincode" placeholder="751001" required maxLength={6}
                    error={errors.pincode?.message} {...register("pincode")} />
                  <Input label="City" placeholder="Bhubaneswar" required
                    error={errors.city?.message} {...register("city")} />
                </div>
                <Input label="Address" placeholder="House no, Street, Area..." required
                  error={errors.address?.message} {...register("address")} />
                <Input label="State" placeholder="Odisha" required
                  error={errors.state?.message} {...register("state")} />
                <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  Continue to Payment <ChevronRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* STEP 1: Payment */}
          {step === 1 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>

              <div className="space-y-3 mb-6">
                {PAYMENT_METHODS.map(method => (
                  <label
                    key={method.id}
                    className={clsx(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      payment === method.id
                        ? "border-primary bg-primary-50"
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={payment === method.id}
                      onChange={() => setPayment(method.id)}
                      className="text-primary w-4 h-4"
                    />
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{method.label}</p>
                      <p className="text-xs text-gray-500">{method.sub}</p>
                    </div>
                    {payment === method.id && (
                      <Check size={16} className="text-primary ml-auto" />
                    )}
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)}
                  className="btn-ghost px-6 py-3 border border-gray-200">
                  ← Back
                </button>
                <button onClick={() => { setStep(2); window.scrollTo({ top:0, behavior:"smooth" }); }}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                  Review Order <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Review */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Address Summary */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    <h3 className="font-semibold text-sm">Delivery Address</h3>
                  </div>
                  <button onClick={() => setStep(0)} className="text-xs text-primary hover:underline">
                    Change
                  </button>
                </div>
                <p className="text-sm text-gray-700 font-medium">{address?.fullName}</p>
                <p className="text-sm text-gray-600">{address?.address}</p>
                <p className="text-sm text-gray-600">{address?.city}, {address?.state} — {address?.pincode}</p>
                <p className="text-sm text-gray-600">📞 {address?.phone}</p>
              </div>

              {/* Payment Summary */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-primary" />
                    <h3 className="font-semibold text-sm">Payment Method</h3>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline">
                    Change
                  </button>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {PAYMENT_METHODS.find(m => m.id === payment)?.label}
                </p>
              </div>

              {/* Items */}
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-3">Order Items ({items.length})</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item._id} className="flex items-center gap-3">
                      <img src={item.image || "https://placehold.co/48x48?text=P"}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Place Order */}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="btn-ghost px-6 py-3 border border-gray-200">
                  ← Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 text-base"
                >
                  {placing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Place Order · ₹{total.toLocaleString("en-IN")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right — Order Summary */}
        <div>
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item._id} className="flex items-center gap-2.5">
                  <div className="relative">
                    <img src={item.image || "https://placehold.co/40x40?text=P"}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-gray-50" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 text-white
                                     text-[9px] rounded-full flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 flex-1 line-clamp-2">{item.name}</p>
                  <p className="text-xs font-semibold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className={delivery === 0 ? "text-green-600" : ""}>
                  {delivery === 0 ? "FREE" : `₹${delivery}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base
                              border-t border-gray-100 pt-2">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-400">
              <Lock size={11} /> Secure checkout powered by SSL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

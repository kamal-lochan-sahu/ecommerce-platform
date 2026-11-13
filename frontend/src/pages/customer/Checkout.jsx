import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, CreditCard, Check, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import Input from "../../components/ui/Input";
import Breadcrumb from "../../components/common/Breadcrumb";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import orderService from "../../services/order.service";
import api from "../../services/api";
import { calculateOrderPricing } from "../../utils/orderPricing";
import useStoreSettings from "../../hooks/useStoreSettings";
import usePageTitle from "../../hooks/usePageTitle";
import { onImageError } from "../../utils/imageFallback";

const schema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email:    z.string().email("Please enter a valid email").optional().or(z.literal('')),
  phone:    z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid phone number"),
  pincode:  z.string().length(6, "Enter a valid 6-digit pincode"),
  address:  z.string().min(10, "Please enter your full address"),
  city:     z.string().min(2, "Please enter your city"),
  state:    z.string().min(2, "Please enter your state"),
});

const PAYMENT_METHODS = [
  { id: "razorpay", label: "Razorpay",          sub: "UPI, Cards, Net Banking", icon: "💳" },
  { id: "cod",      label: "Cash on Delivery",  sub: "Pay when you receive",    icon: "💵" },
  { id: "stripe",   label: "Stripe",            sub: "International Cards",     icon: "🌐" },
];

const STEPS = ["Address", "Payment", "Review"];

const DEFAULT_SETTINGS = { taxRate: 18, deliveryFee: 49, freeDeliveryAbove: 499, allowGuestCheckout: true };

// Razorpay's checkout SDK isn't bundled — it must be loaded from their CDN
// at runtime. Resolves immediately if it's already on the page (e.g. a
// second checkout attempt in the same session), so this is cheap to call
// every time right before opening the popup.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { brandName } = useStoreSettings();
  usePageTitle("Checkout");
  const navigate = useNavigate();
  const location = useLocation();
  const { items, totalAmount, clearCart, couponCode, couponDiscount, couponScoped, clearCoupon } = useCartStore();
  const { user } = useAuthStore();
  const isGuest = !user;
  const [step,    setStep]    = useState(0);
  const [payment, setPayment] = useState("razorpay");
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSavedId, setSelectedSavedId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Guest + Cash on Delivery: phone OTP se verify karna zaroori (fake/prank COD orders rokne ke liye).
  // phoneProof = server ka diya hua chhota token, sirf usi phone ke liye.
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [phoneProof, setPhoneProof] = useState({ phone: "", token: "" });

  // Real tax/delivery numbers — same source the backend uses, so what's
  // shown here always matches what actually gets charged.
  useEffect(() => {
    api.get("/settings/public")
      .then(res => {
        const s = res?.data?.data;
        if (s) setSettings({
          taxRate: s.taxRate,
          deliveryFee: s.deliveryFee,
          freeDeliveryAbove: s.freeDeliveryAbove,
          allowGuestCheckout: s.allowGuestCheckout !== false,
        });
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => setSettingsLoaded(true));
  }, []);

  // OTP "Resend" countdown
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Saved addresses — so checkout doesn't create a duplicate address row
  // on every single order for repeat customers.
  useEffect(() => {
    if (!user) return;
    api.get("/addresses")
      .then(res => {
        const list = res?.data?.data?.addresses || [];
        setSavedAddresses(list);
        if (list.length > 0) {
          const def = list.find(a => a.isDefault) || list[0];
          setSelectedSavedId(def._id);
          setShowNewAddressForm(false);
        }
      })
      .catch(() => { /* no saved addresses available */ });
  }, [user]);

  const discount = couponCode ? Math.min(couponDiscount, totalAmount) : 0;
  // Tax discount ke baad wali amount par (server ke order.controller jaisa hi hisaab, shared formula)
  const { shippingCharge: delivery, tax, total } = calculateOrderPricing({ subtotal: totalAmount, couponDiscount: discount, settings });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user?.name || "", phone: user?.phone || "" },
  });

  const onAddressSubmit = (data) => {
    // Phone badla to purana OTP / proof is number ke liye bekaar hai
    if (data.phone !== address?.phone) { setOtpSent(false); setOtpCode(""); }
    setAddress(data);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const guestPhoneVerified = isGuest && !!phoneProof.token && phoneProof.phone === address?.phone;
  const needsGuestOtp = isGuest && payment === "cod" && !guestPhoneVerified;

  const sendGuestOtp = async () => {
    setOtpBusy(true);
    try {
      await orderService.guestSendOtp(address.phone);
      setOtpSent(true);
      setOtpCode("");
      setResendIn(30);
      toast.success(`OTP sent to ${address.phone}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send the OTP. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyGuestOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) { toast.error("Enter the 6-digit OTP"); return; }
    setOtpBusy(true);
    try {
      const res = await orderService.guestVerifyOtp(address.phone, otpCode);
      const token = res?.data?.data?.phoneToken;
      if (!token) throw new Error("No token");
      setPhoneProof({ phone: address.phone, token });
      setOtpSent(false);
      toast.success("Phone verified ✅");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setOtpBusy(false);
    }
  };

  const useSavedAddress = () => {
    const saved = savedAddresses.find(a => a._id === selectedSavedId);
    if (!saved) { toast.error("Please select an address"); return; }
    setAddress({ ...saved, address: saved.addressLine1, _id: saved._id });
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      let payload;

      if (user) {
        let addrId = address?._id;

        // Only create a new Address doc when the customer actually typed a
        // new one — reusing a saved address doesn't create a duplicate.
        if (!addrId) {
          const addressRes = await api.post("/addresses", {
            fullName: address.fullName,
            phone: address.phone,
            pincode: address.pincode,
            city: address.city,
            state: address.state,
            addressLine1: address.address,
            addressLine2: "",
            country: "India",
            isDefault: savedAddresses.length === 0,
          });
          addrId = addressRes?.data?.data?.address?._id;
        }

        if (!addrId) throw new Error("Failed to save delivery address. Please try again.");

        payload = {
          addressId: addrId,
          paymentMethod: payment,
          couponCode: couponCode || undefined,
          notes: "Order from UI",
        };
      } else {
        // Guest: koi Address document nahi banta — details order par snapshot hoti hain.
        // Cart server par x-session-id se mil jaata hai.
        payload = {
          paymentMethod: payment,
          couponCode: couponCode || undefined,
          notes: "Order from UI",
          guest: {
            name: address.fullName.trim(),
            phone: address.phone,
            email: (address.email || "").trim(),
            phoneToken: payment === "cod" ? phoneProof.token : undefined,
            address: {
              addressLine1: address.address.trim(),
              city: address.city.trim(),
              state: address.state.trim(),
              pincode: address.pincode,
            },
          },
        };
      }

      const orderRes = await orderService.create(payload);

      const orderData = orderRes?.data?.data;
      const order = orderData?.order;

      // Stripe — redirect to hosted checkout page
      if (payment === "stripe" && orderData?.sessionUrl) {
        window.location.href = orderData.sessionUrl;
        return;
      }

      // Razorpay — launch SDK
      if (payment === "razorpay" && orderData?.razorpayOrder) {
        const scriptOk = await loadRazorpayScript();
        if (!scriptOk) {
          toast.error("Couldn't load the payment gateway. Check your connection and try again.");
          return;
        }
        const rzp = orderData.razorpayOrder;
        const options = {
          key: rzp.key,
          amount: rzp.amount,
          currency: rzp.currency,
          name: brandName,
          description: `Order ${order?.orderNumber}`,
          order_id: rzp.id,
          handler: async (response) => {
            try {
              await import("../../services/order.service").then(m =>
                m.default.verifyRazorpay({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: order._id,
                })
              );
              clearCart();
              clearCoupon();
              toast.success("Payment successful! 🎉");
              navigate("/order-success", { state: { orderId: order?._id, orderNumber: order?.orderNumber, guestEmail: isGuest ? (address?.email || "") : undefined } });
            } catch {
              toast.error("Payment verification failed. Contact support.");
            }
          },
          prefill: { name: address?.fullName, contact: address?.phone, email: isGuest ? (address?.email || undefined) : undefined },
          theme: { color: "#6366f1" },
        };
        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
        return;
      }

      // COD
      clearCart();
      clearCoupon();
      toast.success("Order placed successfully! 🎉");
      navigate("/order-success", { state: { orderId: order?._id, orderNumber: order?.orderNumber, guestEmail: isGuest ? (address?.email || "") : undefined } });
    } catch (err) {
      console.error(err);
      // Guest COD: proof expire/galat ho gaya — wapas verify karwao
      if (isGuest && err?.response?.data?.errors?.includes?.("PHONE_NOT_VERIFIED")) {
        setPhoneProof({ phone: "", token: "" });
        setStep(1);
      }
      toast.error(err?.response?.data?.message || "Order failed. Try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500 mb-4">Your cart is empty!</p>
        <a href="/products" className="btn-primary px-6 py-2.5">Start Shopping</a>
      </div>
    );
  }

  // Admin ne guest checkout band kiya hai: login ke bina checkout nahi
  if (isGuest && !settingsLoaded) {
    return <div className="page-container text-center py-20 text-gray-400 text-sm">Loading checkout…</div>;
  }
  if (isGuest && !settings.allowGuestCheckout) {
    return (
      <div className="page-container text-center py-20 max-w-md">
        <Lock size={32} className="mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Please log in to check out</h2>
        <p className="text-gray-500 text-sm mb-5">Your cart is saved — it will be waiting for you after you log in.</p>
        <Link to="/login" state={{ from: location }} className="btn-primary px-6 py-2.5 inline-block">Login to continue</Link>
        <p className="text-sm text-gray-500 mt-4">
          New here? <Link to="/register" state={{ from: location }} className="text-primary font-medium hover:underline">Create an account</Link>
        </p>
      </div>
    );
  }

  const paymentMethods = PAYMENT_METHODS.filter((m) => user || m.id !== "stripe"); // Stripe ke liye account chahiye

  return (
    <div className="page-container max-w-5xl">
      <Breadcrumb items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />

      <div className="flex items-center justify-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold",
              i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-white" : "bg-gray-100 text-gray-400")}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={clsx("ml-2 text-sm font-medium",
              i === step ? "text-primary" : i < step ? "text-green-600" : "text-gray-400")}>{s}</span>
            {i < STEPS.length - 1 && <div className={clsx("mx-3 h-px w-12", i < step ? "bg-green-400" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">

          {/* Step 0: Address */}
          {step === 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Delivery Address</h2>
              </div>

              {!showNewAddressForm && savedAddresses.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {savedAddresses.map(a => (
                      <label key={a._id} className={clsx("flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        selectedSavedId === a._id ? "border-primary bg-primary-50" : "border-gray-100 hover:border-gray-200")}>
                        <input type="radio" name="savedAddress" className="mt-1 text-primary w-4 h-4"
                          checked={selectedSavedId === a._id} onChange={() => setSelectedSavedId(a._id)} />
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{a.fullName} {a.isDefault && <span className="text-xs text-primary font-normal">(Default)</span>}</p>
                          <p className="text-gray-600">{a.addressLine1}, {a.city}, {a.state} — {a.pincode}</p>
                          <p className="text-gray-500">📞 {a.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={() => setShowNewAddressForm(true)}
                    className="text-sm text-primary font-medium hover:underline">
                    + Use a different address
                  </button>
                  <button onClick={useSavedAddress} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    Continue to Payment <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onAddressSubmit)} className="space-y-4">
                  {!user && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                      💡 Checking out as a guest —{" "}
                      <Link to="/login" state={{ from: location }} className="font-semibold underline">Login</Link> to use saved addresses and see your order history
                    </div>
                  )}
                  {savedAddresses.length > 0 && (
                    <button type="button" onClick={() => setShowNewAddressForm(false)}
                      className="text-sm text-primary font-medium hover:underline">
                      ← Use a saved address instead
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Full Name" placeholder="Kamal Sahu" required error={errors.fullName?.message} {...register("fullName")} />
                    <Input label="Phone" type="tel" placeholder="9876543210" required error={errors.phone?.message} {...register("phone")} />
                  </div>
                  {isGuest && (
                    <Input label="Email (for order updates)" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Pincode" placeholder="751001" required maxLength={6} error={errors.pincode?.message} {...register("pincode")} />
                    <Input label="City" placeholder="Bhubaneswar" required error={errors.city?.message} {...register("city")} />
                  </div>
                  <Input label="Address" placeholder="House no, Street, Area..." required error={errors.address?.message} {...register("address")} />
                  <Input label="State" placeholder="Odisha" required error={errors.state?.message} {...register("state")} />
                  <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    Continue to Payment <ChevronRight size={16} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={20} className="text-primary" />
                <h2 className="text-lg font-semibold">Payment Method</h2>
              </div>
              <div className="space-y-3 mb-6">
                {paymentMethods.map(method => (
                  <label key={method.id} className={clsx("flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    payment === method.id ? "border-primary bg-primary-50" : "border-gray-100 hover:border-gray-200")}>
                    <input type="radio" name="payment" value={method.id} checked={payment === method.id}
                      onChange={() => setPayment(method.id)} className="text-primary w-4 h-4" />
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{method.label}</p>
                      <p className="text-xs text-gray-500">{method.sub}</p>
                    </div>
                    {payment === method.id && <Check size={16} className="text-primary ml-auto" />}
                  </label>
                ))}
              </div>
              {payment === "cod" && user?.isPhoneVerified === false && (
                <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  Cash on Delivery needs a verified phone number.{" "}
                  <Link to="/profile" className="font-semibold underline">Verify it in your Profile</Link>
                  {" "}or choose an online payment method.
                </div>
              )}
              {isGuest && payment === "cod" && (
                <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                  {guestPhoneVerified ? (
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <ShieldCheck size={16} /> Phone number {address?.phone} verified
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">
                        Cash on Delivery needs a verified phone number. We will send an OTP to <span className="font-semibold">{address?.phone}</span>.
                      </p>
                      {!otpSent ? (
                        <button type="button" onClick={sendGuestOtp} disabled={otpBusy}
                          className="btn-primary px-5 py-2.5 text-sm">
                          {otpBusy ? "Sending…" : "Send OTP"}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input type="text" inputMode="numeric" maxLength={6} value={otpCode} autoComplete="one-time-code"
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                              placeholder="6-digit OTP"
                              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm tracking-widest focus:outline-none focus:border-primary" />
                            <button type="button" onClick={verifyGuestOtp} disabled={otpBusy || otpCode.length !== 6}
                              className="btn-primary px-5 py-2.5 text-sm">
                              {otpBusy ? "Checking…" : "Verify"}
                            </button>
                          </div>
                          <button type="button" onClick={sendGuestOtp} disabled={otpBusy || resendIn > 0}
                            className="text-xs text-primary font-medium hover:underline disabled:text-gray-400 disabled:no-underline">
                            {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Or choose an online payment method — no OTP needed.</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-ghost px-6 py-3 border border-gray-200">← Back</button>
                <button onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={needsGuestOtp}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  Review Order <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><MapPin size={16} className="text-primary" /><h3 className="font-semibold text-sm">Delivery Address</h3></div>
                  <button onClick={() => setStep(0)} className="text-xs text-primary hover:underline">Change</button>
                </div>
                <p className="text-sm font-medium text-gray-700">{address?.fullName}</p>
                <p className="text-sm text-gray-600">{address?.address}</p>
                <p className="text-sm text-gray-600">{address?.city}, {address?.state} — {address?.pincode}</p>
                <p className="text-sm text-gray-600">📞 {address?.phone}</p>
                {isGuest && address?.email && <p className="text-sm text-gray-600">✉️ {address.email}</p>}
              </div>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><CreditCard size={16} className="text-primary" /><h3 className="font-semibold text-sm">Payment</h3></div>
                  <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline">Change</button>
                </div>
                <p className="text-sm font-medium text-gray-700">{paymentMethods.find(m => m.id === payment)?.label}</p>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold text-sm mb-3">Items ({items.length})</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={`${item._id}-${item.variant}`} className="flex items-center gap-3">
                      <img onError={onImageError} src={item.images?.[0] || item.image || "https://placehold.co/400x400?text=Product"} alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                        {item.variantLabel && <p className="text-xs text-gray-400">{item.variantLabel}</p>}
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost px-6 py-3 border border-gray-200">← Back</button>
                <button onClick={handlePlaceOrder} disabled={placing || needsGuestOtp}
                  className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                  {placing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Placing...</>
                  ) : (
                    <><Lock size={16} />Place Order · ₹{total.toLocaleString("en-IN")}</>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                By placing your order you agree to our{" "}
                <Link to="/terms" className="underline hover:text-primary">Terms &amp; Conditions</Link> and{" "}
                <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
              </p>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={`${item._id}-${item.variant}`} className="flex items-center gap-2.5">
                  <div className="relative">
                    <img onError={onImageError} src={item.images?.[0] || item.image || "https://placehold.co/400x400?text=Product"} alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-gray-50" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{item.quantity}</span>
                  </div>
                  <p className="text-xs text-gray-700 flex-1 line-clamp-2">
                    {item.name}{item.variantLabel && <span className="text-gray-400"> ({item.variantLabel})</span>}
                  </p>
                  <p className="text-xs font-semibold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{totalAmount.toLocaleString("en-IN")}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon ({couponCode}{couponScoped ? ", eligible items only" : ""})</span><span>−₹{discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span className={delivery === 0 ? "text-green-600" : ""}>{delivery === 0 ? "FREE" : `₹${delivery}`}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (GST {settings.taxRate}%)</span><span>₹{tax.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2">
                <span>Total</span><span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-400">
              <Lock size={11} /> Secure SSL checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Phone } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";

const schema = z.object({
  email:    z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [mode, setMode] = useState("password"); // "password" | "phone"
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const from = location.state?.from?.pathname || "/";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await authService.login(data);
      login(res.data.data.user, res.data.data.accessToken);
      // Merge guest cart AFTER login so access token is set
      useCartStore.getState().mergeGuestCart();
      toast.success(`Welcome back, ${res.data.data.user.name.split(" ")[0]}! 👋`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Try again.");
    }
  };

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");
    setSendingOtp(true);
    try {
      await authService.sendOtp({ phone });
      toast.success("OTP sent to your phone!");
      navigate("/verify-otp", { state: { phone, type: "phone-login" } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't send OTP. Try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <AuthLayout title="Welcome back!" subtitle="Login to your account">
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "password" ? "bg-white shadow text-gray-900" : "text-gray-500"
          }`}
        >
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "phone" ? "bg-white shadow text-gray-900" : "text-gray-500"
          }`}
        >
          Phone OTP
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            prefix={<Mail size={16} />}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Password"
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            prefix={<Lock size={16} />}
            suffix={
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-primary" />
              <span className="text-gray-600">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={isSubmitting} size="lg">
            Login
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="9876543210"
            prefix={<Phone size={16} />}
            error={phoneError}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />

          <Button type="button" fullWidth loading={sendingOtp} size="lg" onClick={handleSendOtp}>
            Send OTP
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-gray-600 mt-5">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary font-semibold hover:underline">
          Sign Up
        </Link>
      </p>
    </AuthLayout>
  );
}

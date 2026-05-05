import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";
import useAuthStore from "../../store/authStore";

const schema = z.object({
  name:     z.string().min(2, "Name kam se kam 2 characters"),
  email:    z.string().email("Valid email daalo"),
  phone:    z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit Indian mobile number daalo"),
  password: z.string().min(6, "Password kam se kam 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords match nahi kar rahe",
  path: ["confirmPassword"],
});

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...payload } = data;
      const res = await authService.register(payload);
      if (res.data.data.requiresOTP) {
        toast.success("OTP bheja gaya! Check karo.");
        navigate("/verify-otp", { state: { email: data.email, type: "register" } });
      } else {
        login(res.data.data.user, res.data.data.accessToken);
        toast.success("Account create ho gaya! 🎉");
        navigate("/");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Free mein join karo">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <Input
          label="Full Name"
          placeholder="Kamal Lochan"
          prefix={<User size={16} />}
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          prefix={<Mail size={16} />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="9876543210"
          prefix={<Phone size={16} />}
          error={errors.phone?.message}
          {...register("phone")}
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

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          prefix={<Lock size={16} />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" fullWidth loading={isSubmitting} size="lg" className="mt-2">
          Create Account
        </Button>

        <p className="text-center text-sm text-gray-600">
          Pehle se account hai?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

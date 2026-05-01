import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";
import useAuthStore from "../../store/authStore";

const schema = z.object({
  email:    z.string().email("Valid email daalo"),
  password: z.string().min(6, "Password kam se kam 6 characters ka hona chahiye"),
});

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const from = location.state?.from?.pathname || "/";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await authService.login(data);
      login(res.data.user, res.data.accessToken);
      toast.success(`Welcome back, ${res.data.user.name.split(" ")[0]}! 👋`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <AuthLayout title="Welcome back!" subtitle="Login to your account">
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

        <p className="text-center text-sm text-gray-600">
          Account nahi hai?{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

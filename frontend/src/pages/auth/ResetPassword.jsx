import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();

  // The reset email links to /reset-password?token=...&email=... — a fresh
  // page load, so the URL is the source of truth. location.state is kept
  // only as a fallback for in-app navigation that still passes it directly.
  const email = searchParams.get("email") || location.state?.email;
  const token = searchParams.get("token") || location.state?.token;

  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Reset link is invalid or missing. Please request a new one.");
      return;
    }
    try {
      await authService.resetPassword({ email, token, password: data.password });
      toast.success("Password reset successfully! Please login. 🔐");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. Try again.");
    }
  };

  return (
    <AuthLayout title="Set New Password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {!token && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
            This reset link looks invalid or expired. Please request a new
            one from the Forgot Password page.
          </p>
        )}

        <Input
          label="New Password"
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
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          prefix={<Lock size={16} />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <ul className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-xl p-3">
          <li>✅ At least 6 characters</li>
          <li>✅ One uppercase letter (A-Z)</li>
          <li>✅ One number (0-9)</li>
        </ul>

        <Button type="submit" fullWidth loading={isSubmitting} size="lg" disabled={!token}>
          Reset Password
        </Button>
      </form>
    </AuthLayout>
  );
}

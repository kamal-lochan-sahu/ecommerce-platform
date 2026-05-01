import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  password: z.string().min(6, "Password kam se kam 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords match nahi kar rahe",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { email, token } = location.state || {};
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await authService.resetPassword({ email, token, password: data.password });
      toast.success("Password reset ho gaya! Ab login karo. 🔐");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. Try again.");
    }
  };

  return (
    <AuthLayout title="Naya Password Set Karo" subtitle="Strong password choose karo">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        {/* Password strength hint */}
        <ul className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-xl p-3">
          <li>✅ Kam se kam 6 characters</li>
          <li>✅ Ek uppercase letter (A-Z)</li>
          <li>✅ Ek number (0-9)</li>
        </ul>

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Reset Password
        </Button>
      </form>
    </AuthLayout>
  );
}

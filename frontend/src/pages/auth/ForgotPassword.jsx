import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export default function ForgotPassword() {
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await authService.forgotPassword(data);
      toast.success("OTP sent! Please check your email. 📧");
      navigate("/verify-otp", { state: { email: data.email, type: "reset" } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Email not found.");
    }
  };

  return (
    <AuthLayout
      title="Forgot Password? 😅"
      subtitle="Enter your email to receive an OTP"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Registered Email"
          type="email"
          placeholder="you@example.com"
          prefix={<Mail size={16} />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Send OTP
        </Button>

        <p className="text-center text-sm text-gray-600">
          Remembered it?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

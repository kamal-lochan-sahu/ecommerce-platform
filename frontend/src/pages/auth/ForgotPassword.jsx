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
  email: z.string().email("Valid email daalo"),
});

export default function ForgotPassword() {
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await authService.forgotPassword(data);
      toast.success("OTP bheja gaya! Email check karo. 📧");
      navigate("/verify-otp", { state: { email: data.email, type: "reset" } });
    } catch (err) {
      toast.error(err.response?.data?.message || "Email nahi mila.");
    }
  };

  return (
    <AuthLayout
      title="Password bhool gaye? 😅"
      subtitle="Email daalo — OTP bhejte hain"
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
          Yaad aa gaya?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

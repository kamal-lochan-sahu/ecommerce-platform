import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await authService.forgotPassword(data);
      // The backend emails a reset LINK, not an OTP code — there's nothing
      // to type in here, so show a confirmation instead of routing to an
      // OTP screen that would never receive anything.
      setSentTo(data.email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong.");
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email 📬" subtitle="">
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto text-green-500" size={48} />
          <p className="text-gray-600">
            If an account exists for <span className="font-semibold">{sentTo}</span>,
            a password reset link has been sent. Click the link in that email
            to set a new password — it's valid for 1 hour.
          </p>
          <p className="text-sm text-gray-500">
            Didn't get it? Check spam, or{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-primary font-semibold hover:underline"
            >
              try again
            </button>.
          </p>
          <Link to="/login" className="inline-block text-primary font-semibold hover:underline">
            Back to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot Password? 😅"
      subtitle="Enter your email to receive a reset link"
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
          Send Reset Link
        </Button>

        <p className="text-center text-sm text-gray-600">
          Remembered it?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Button from "../../components/ui/Button";
import authService from "../../services/auth.service";
import useAuthStore from "../../store/authStore";

export default function VerifyOTP() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuthStore();
  const { email, type } = location.state || {};

  const [otp, setOtp]           = useState(["", "", "", "", "", ""]);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer]       = useState(60);
  const inputRefs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) navigate("/login");
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timer === 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pasted.every(c => /[0-9]/.test(c))) {
      const newOtp = [...Array(6)].map((_, i) => pasted[i] || "");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return toast.error("6-digit OTP daalo!");

    setLoading(true);
    try {
      const res = await authService.verifyOTP({ email, otp: code, type });
      if (type === "register") {
        login(res.data.user, res.data.accessToken);
        toast.success("Email verify ho gaya! Welcome 🎉");
        navigate("/");
      } else {
        toast.success("OTP verified! Ab password reset karo.");
        navigate("/reset-password", { state: { email, token: res.data.resetToken } });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP galat hai.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.resendOTP({ email, type });
      toast.success("Naya OTP bheja gaya!");
      setTimer(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error("Resend failed. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="OTP Verify karo"
      subtitle={`6-digit code bheja gaya: ${email}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2
                         border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100
                         outline-none transition-all"
            />
          ))}
        </div>

        <Button type="submit" fullWidth loading={loading} size="lg">
          Verify OTP
        </Button>

        {/* Resend */}
        <div className="text-center text-sm text-gray-500">
          {timer > 0 ? (
            <span>Resend in <span className="text-primary font-semibold">{timer}s</span></span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-primary font-semibold hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}

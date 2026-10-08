import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import userService from "../../services/user.service";
import useAuthStore from "../../store/authStore";
import { parseIdentifier } from "../../utils/identity";

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition";
const btnCls =
  "px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap";

// Shown on Profile for phone-only accounts (no real email yet).
// Step 1: enter email -> we email a code.  Step 2: enter code -> email is saved.
export default function AddEmailForm() {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [step, setStep] = useState("enter"); // "enter" | "code"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const parsed = parseIdentifier(email);
    if (parsed.type !== "email") {
      toast.error("Please enter a valid email");
      return;
    }
    setBusy(true);
    try {
      await userService.requestEmail({ email: parsed.value });
      setEmail(parsed.value);
      setStep("code");
      toast.success("Code sent! Check your inbox.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send the code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const res = await userService.verifyEmail({ otp });
      updateUser({ email: res.data.data.user.email, isVerified: true });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Email added!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
      {step === "enter" ? (
        <>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputCls}
            />
            <button type="button" onClick={sendCode} disabled={busy} className={btnCls}>
              {busy ? "Sending..." : "Send code"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Add your email to get order updates and recover your account. We will send a code to confirm it is yours.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-2">
            Enter the 6-digit code we sent to <span className="font-medium text-gray-700">{email}</span>.
          </p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoComplete="one-time-code"
              className={inputCls}
            />
            <button type="button" onClick={verify} disabled={busy} className={btnCls}>
              {busy ? "Verifying..." : "Verify"}
            </button>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <button type="button" onClick={sendCode} disabled={busy} className="text-indigo-600 hover:underline">
              Resend code
            </button>
            <button
              type="button"
              onClick={() => { setStep("enter"); setOtp(""); }}
              className="text-gray-500 hover:underline"
            >
              Change email
            </button>
          </div>
        </>
      )}
    </div>
  );
}

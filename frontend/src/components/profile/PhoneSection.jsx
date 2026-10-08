import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import userService from "../../services/user.service";
import useAuthStore from "../../store/authStore";
import { PHONE_RE } from "../../utils/identity";

const inputCls =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition";
const btnCls =
  "px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors whitespace-nowrap";
const RESEND_SECONDS = 30; // matches the server-side cooldown

// A phone number is a login identifier, so it is only "ours" once an OTP sent to it is
// confirmed. This replaces the old free-text phone box (which let anyone claim any number).
//   view  -> shows the number + Verified / Not verified badge
//   enter -> type a new number (add or change)
//   code  -> type the 6-digit OTP
export default function PhoneSection({ phone, verified }) {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [mode, setMode] = useState("view");
  const [value, setValue] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async (number) => {
    if (!PHONE_RE.test(number)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      await userService.requestPhone({ phone: number });
      setValue(number);
      setOtp("");
      setMode("code");
      setCooldown(RESEND_SECONDS);
      toast.success("OTP sent!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send the OTP. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setBusy(true);
    try {
      const res = await userService.verifyPhone({ otp });
      const u = res.data.data.user;
      updateUser({ phone: u.phone, isPhoneVerified: true });
      qc.invalidateQueries({ queryKey: ["profile"] });
      setMode("view");
      toast.success("Mobile number verified!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>;

  if (mode === "enter") {
    return (
      <div>
        {label}
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            maxLength={10}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            placeholder="9876543210"
            autoComplete="tel-national"
            className={inputCls}
          />
          <button type="button" onClick={() => sendOtp(value)} disabled={busy} className={btnCls}>
            {busy ? "Sending..." : "Send OTP"}
          </button>
        </div>
        <button type="button" onClick={() => setMode("view")} className="text-xs text-gray-500 hover:underline mt-2">
          Cancel
        </button>
      </div>
    );
  }

  if (mode === "code") {
    return (
      <div>
        {label}
        <p className="text-xs text-gray-500 mb-2">
          Enter the 6-digit OTP sent to <span className="font-medium text-gray-700">+91 {value}</span>.
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
          <button
            type="button"
            onClick={() => sendOtp(value)}
            disabled={busy || cooldown > 0}
            className="text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </button>
          <button
            type="button"
            onClick={() => { setValue(""); setMode("enter"); }}
            className="text-gray-500 hover:underline"
          >
            Change number
          </button>
        </div>
      </div>
    );
  }

  // view
  return (
    <div>
      {label}
      {phone ? (
        <>
          <div className="flex items-center gap-2">
            <input
              value={`+91 ${phone}`}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
            />
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {verified ? "Verified" : "Not verified"}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            {!verified && (
              <button type="button" onClick={() => sendOtp(phone)} disabled={busy} className="text-indigo-600 hover:underline">
                Verify now
              </button>
            )}
            <button
              type="button"
              onClick={() => { setValue(""); setMode("enter"); }}
              className="text-gray-500 hover:underline"
            >
              Change number
            </button>
          </div>
          {!verified && (
            <p className="text-xs text-gray-500 mt-1.5">
              Verify your number to log in with it and to get order updates.
            </p>
          )}
        </>
      ) : (
        <>
          <button type="button" onClick={() => setMode("enter")} className={btnCls}>
            Add mobile number
          </button>
          <p className="text-xs text-gray-500 mt-1.5">We will send an OTP to confirm it is yours.</p>
        </>
      )}
    </div>
  );
}

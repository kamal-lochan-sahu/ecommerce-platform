import { useState, useEffect } from "react";

function pad(n) { return String(n).padStart(2, "0"); }

function Box({ val, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center
                      justify-center text-xl font-bold font-mono">
        {pad(val)}
      </div>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

export default function DealTimer({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(endsAt) - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <div className="flex items-end gap-2">
      <Box val={timeLeft.h} label="HRS" />
      <span className="text-gray-900 font-bold text-xl mb-3">:</span>
      <Box val={timeLeft.m} label="MIN" />
      <span className="text-gray-900 font-bold text-xl mb-3">:</span>
      <Box val={timeLeft.s} label="SEC" />
    </div>
  );
}

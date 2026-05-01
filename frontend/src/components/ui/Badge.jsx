import { clsx } from "clsx";

const variants = {
  primary: "bg-indigo-50 text-indigo-700",
  success: "bg-emerald-50 text-emerald-700",
  danger:  "bg-red-50 text-red-700",
  amber:   "bg-amber-50 text-amber-700",
  gray:    "bg-gray-100 text-gray-700",
  blue:    "bg-blue-50 text-blue-700",
};

export default function Badge({ children, variant = "primary", className = "" }) {
  return (
    <span className={clsx(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variants[variant], className
    )}>
      {children}
    </span>
  );
}

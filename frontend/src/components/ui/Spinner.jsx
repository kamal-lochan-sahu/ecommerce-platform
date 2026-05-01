import { clsx } from "clsx";

const sizes  = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10", xl: "w-16 h-16" };
const colors = {
  primary: "border-primary-500",
  white:   "border-white",
  gray:    "border-gray-400",
};

export default function Spinner({ size = "md", color = "primary", className = "" }) {
  return (
    <div className={clsx(
      "border-2 border-t-transparent rounded-full animate-spin",
      sizes[size], colors[color], className
    )} />
  );
}

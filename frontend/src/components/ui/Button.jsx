import { forwardRef } from "react";
import { clsx } from "clsx";
import Spinner from "./Spinner";

const variants = {
  primary:   "bg-primary text-white hover:bg-primary-600 focus:ring-primary-500 active:scale-95",
  secondary: "border border-primary text-primary hover:bg-primary-50 focus:ring-primary-500",
  danger:    "bg-danger text-white hover:bg-red-600 focus:ring-red-500",
  ghost:     "text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
  success:   "bg-success text-white hover:bg-emerald-600 focus:ring-emerald-500",
};

const sizes = {
  sm:  "px-3 py-1.5 text-xs",
  md:  "px-5 py-2.5 text-sm",
  lg:  "px-6 py-3 text-base",
  xl:  "px-8 py-4 text-lg",
  icon:"p-2",
};

const Button = forwardRef(({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium rounded-xl",
        "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" color={variant === "primary" ? "white" : "primary"} />}
      {children}
    </button>
  );
});

Button.displayName = "Button";
export default Button;

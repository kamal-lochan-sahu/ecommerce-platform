import { forwardRef } from "react";
import { clsx } from "clsx";

const Input = forwardRef(({
  label,
  error,
  hint,
  prefix,
  suffix,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 text-gray-400 pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full py-2.5 rounded-lg border text-sm transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:border-transparent",
            "placeholder-gray-400 bg-white",
            error
              ? "border-danger focus:ring-red-400 text-red-900"
              : "border-gray-300 focus:ring-primary-500 text-gray-900",
            prefix ? "pl-10" : "pl-4",
            suffix ? "pr-10" : "pr-4",
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 text-gray-400">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

Input.displayName = "Input";
export default Input;

import { useEffect } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

const sizes = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-xl",
  "2xl":"max-w-2xl",
  full: "max-w-full mx-4",
};

export default function Modal({ isOpen, onClose, title, children, size = "md", hideClose = false }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Box */}
      <div className={clsx(
        "relative w-full bg-white rounded-2xl shadow-xl z-10",
        "animate-in fade-in zoom-in-95 duration-200",
        sizes[size]
      )}>
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {/* Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

const positions = {
  right: {
    container: "right-0 top-0 h-full",
    enter:     "translate-x-0",
    exit:      "translate-x-full",
  },
  left: {
    container: "left-0 top-0 h-full",
    enter:     "translate-x-0",
    exit:      "-translate-x-full",
  },
  bottom: {
    container: "bottom-0 left-0 right-0",
    enter:     "translate-y-0",
    exit:      "translate-y-full",
  },
};

export default function Drawer({
  isOpen, onClose, title, children,
  position = "right",
  width = "w-full max-w-md",
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const pos = positions[position];

  return (
    <div className={clsx("fixed inset-0 z-50", !isOpen && "pointer-events-none")}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Panel */}
      <div className={clsx(
        "absolute bg-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out",
        pos.container,
        position !== "bottom" && width,
        isOpen ? pos.enter : pos.exit
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

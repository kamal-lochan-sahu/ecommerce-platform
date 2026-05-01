import { Star } from "lucide-react";
import { clsx } from "clsx";

export default function Rating({ value = 0, count = null, size = 14, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onChange?.(star)}
            className={clsx(!interactive && "cursor-default pointer-events-none")}
          >
            <Star
              size={size}
              className={clsx(
                "transition-colors",
                star <= value ? "text-amber-400 fill-amber-400" : "text-gray-300 fill-gray-100"
              )}
            />
          </button>
        ))}
      </div>
      {count !== null && (
        <span className="text-xs text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
}

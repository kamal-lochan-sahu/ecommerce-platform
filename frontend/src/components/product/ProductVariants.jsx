import { clsx } from "clsx";

export function ColorVariant({ colors = [], selected, onChange }) {
  if (!colors.length) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        Color: <span className="text-gray-900 font-semibold">{selected}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color.name}
            onClick={() => onChange(color.name)}
            title={color.name}
            className={clsx(
              "w-8 h-8 rounded-full border-2 transition-all",
              selected === color.name
                ? "border-primary scale-110 shadow-md"
                : "border-gray-200 hover:border-gray-400"
            )}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    </div>
  );
}

export function SizeVariant({ sizes = [], selected, onChange }) {
  if (!sizes.length) return null;
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        Size: <span className="text-gray-900 font-semibold">{selected}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.label}
            onClick={() => !size.outOfStock && onChange(size.label)}
            disabled={size.outOfStock}
            className={clsx(
              "min-w-[44px] h-10 px-3 rounded-xl border-2 text-sm font-medium transition-all",
              selected === size.label
                ? "border-primary bg-primary text-white"
                : size.outOfStock
                  ? "border-gray-100 text-gray-300 cursor-not-allowed line-through"
                  : "border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}

import { clsx } from "clsx";
import { getOptionGroups, pickVariant, valueOf, sameValue as same } from "../../utils/variantOptions";


export default function VariantSelector({ variants = [], selected, onSelect }) {
  const groups = getOptionGroups(variants);
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.name}>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {group.name}:{" "}
            <span className="text-gray-900 font-semibold">{valueOf(selected, group.name)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((val) => {
              const isSelected = same(valueOf(selected, group.name), val);
              const available = variants.some((v) => v.stock > 0 && same(valueOf(v, group.name), val));
              return (
                <button
                  key={val}
                  type="button"
                  disabled={!available && !isSelected}
                  onClick={() => onSelect(pickVariant(variants, selected, group.name, val))}
                  className={clsx(
                    "min-w-[44px] h-10 px-3 rounded-xl border-2 text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : available
                        ? "border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
                        : "border-gray-100 text-gray-300 cursor-not-allowed line-through"
                  )}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

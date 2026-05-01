import { useState } from "react";
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";
import Rating from "../ui/Rating";

const PRICE_RANGES = [
  { label: "Under ₹500",        min: 0,     max: 500   },
  { label: "₹500 - ₹1,000",    min: 500,   max: 1000  },
  { label: "₹1,000 - ₹5,000",  min: 1000,  max: 5000  },
  { label: "₹5,000 - ₹10,000", min: 5000,  max: 10000 },
  { label: "Above ₹10,000",    min: 10000, max: 999999 },
];

const BRANDS = ["Nike", "Apple", "Samsung", "Puma", "Adidas", "Sony", "OnePlus", "Boat"];

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp size={16} className="text-gray-400" />
               : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  );
}

export default function ProductFilters({ filters, onChange, onReset, isMobile = false }) {
  const { category, priceRange, brands, rating, inStock } = filters;

  const toggleBrand = (brand) => {
    const next = brands.includes(brand)
      ? brands.filter(b => b !== brand)
      : [...brands, brand];
    onChange({ ...filters, brands: next });
  };

  return (
    <div className={clsx("bg-white", isMobile ? "p-0" : "card p-4")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-primary font-medium hover:underline"
        >
          Reset All
        </button>
      </div>

      {/* Categories */}
      <FilterSection title="Category">
        <div className="space-y-2">
          {["Electronics","Fashion","Home & Living","Beauty","Sports","Books","Toys","Grocery"].map((cat) => (
            <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="category"
                checked={category === cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}
                onChange={() => onChange({
                  ...filters,
                  category: cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")
                })}
                className="text-primary focus:ring-primary-500 w-3.5 h-3.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-primary transition-colors">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => (
            <label key={range.label} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="price"
                checked={priceRange?.min === range.min && priceRange?.max === range.max}
                onChange={() => onChange({ ...filters, priceRange: range })}
                className="text-primary focus:ring-primary-500 w-3.5 h-3.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-primary transition-colors">
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Brand */}
      <FilterSection title="Brand">
        <div className="space-y-2">
          {BRANDS.map((brand) => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={brands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                className="text-primary focus:ring-primary-500 rounded w-3.5 h-3.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-primary transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Minimum Rating">
        <div className="space-y-2">
          {[4, 3, 2, 1].map((r) => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={rating === r}
                onChange={() => onChange({ ...filters, rating: r })}
                className="text-primary focus:ring-primary-500 w-3.5 h-3.5"
              />
              <Rating value={r} size={13} />
              <span className="text-xs text-gray-500">& above</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* In Stock */}
      <FilterSection title="Availability" defaultOpen={true}>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onChange({ ...filters, inStock: e.target.checked })}
            className="text-primary focus:ring-primary-500 rounded w-3.5 h-3.5"
          />
          <span className="text-sm text-gray-600">In Stock Only</span>
        </label>
      </FilterSection>
    </div>
  );
}

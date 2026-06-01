import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import productService from "../../services/product.service";

export default function SearchBar({ onClose, autoFocus = false }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Debounced search for suggestions
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      if (suggestions.length > 0) setSuggestions([]);
      if (showDropdown) setShowDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await productService.search({ q: query, limit: 5 });
        setSuggestions(res.data?.data?.products || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    onClose?.();
    setShowDropdown(false);
    setQuery("");
  };

  const handleSuggestionClick = (slug) => {
    navigate(`/products/${slug}`);
    onClose?.();
    setShowDropdown(false);
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
            placeholder="Search products..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200
                       text-sm focus:outline-none focus:ring-2 focus:ring-primary-500
                       focus:border-transparent bg-gray-50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && <Loader2 size={16} className="text-gray-400 animate-spin" />}
            {query && !loading && (
              <button
                type="button"
                onClick={() => { setQuery(""); setSuggestions([]); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <button type="submit" className="btn-primary px-4 py-2.5 text-sm whitespace-nowrap">
          Search
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {showDropdown && (suggestions.length > 0 || !loading) && query.trim().length >= 2 && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl 
                     border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
        >
          {suggestions.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50">
                Product Suggestions
              </div>
              {suggestions.map((p) => (
                <button
                  key={p._id}
                  onClick={() => handleSuggestionClick(p.slug)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group text-left"
                >
                  <img src={p.images[0] || "https://placehold.co/400x400?text=Product"} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500">₹{p.price?.toLocaleString("en-IN")}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
              <button
                onClick={handleSubmit}
                className="w-full px-4 py-3 text-sm text-primary font-medium bg-primary-50 hover:bg-primary-100 transition-colors flex items-center justify-between"
              >
                Search all results for "{query}"
                <ArrowRight size={16} />
              </button>
            </div>
          ) : !loading && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search size={20} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">No products found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

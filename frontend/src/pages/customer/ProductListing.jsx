import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  SlidersHorizontal, LayoutGrid, List,
  ChevronDown, X
} from "lucide-react";
import { clsx } from "clsx";
import productService from "../../services/product.service";
import ProductFilters from "../../components/product/ProductFilters";
import ProductGrid from "../../components/product/ProductGrid";
import Breadcrumb from "../../components/common/Breadcrumb";
import Drawer from "../../components/ui/Drawer";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";

const SORT_OPTIONS = [
  { value: "newest",    label: "Newest First"    },
  { value: "popular",   label: "Most Popular"    },
  { value: "rating",    label: "Top Rated"       },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc",label: "Price: High to Low" },
  { value: "discount",  label: "Best Discount"   },
];

const DEFAULT_FILTERS = {
  category:   "",
  priceRange: null,
  brands:     [],
  rating:     0,
  inStock:    false,
};

// Mock products while backend connects
const MOCK = Array(20).fill(null).map((_, i) => ({
  _id:          `p-${i}`,
  name:         `Premium Product ${i + 1} — Best Quality Guaranteed`,
  slug:         `premium-product-${i + 1}`,
  brand:        ["Nike","Apple","Samsung","Puma","Adidas","Sony"][i % 6],
  price:        Math.floor(Math.random() * 8000) + 500,
  comparePrice: Math.floor(Math.random() * 12000) + 3000,
  images:       [`https://placehold.co/300x300/f3f4f6/6366f1?text=P${i+1}`],
  ratings:      parseFloat((3 + Math.random() * 2).toFixed(1)),
  totalReviews: Math.floor(Math.random() * 800) + 10,
  stock:        i % 6 === 0 ? 0 : 10,
  discount:     [0, 10, 20, 30, 40, 50][i % 6],
}));

export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters]     = useState({
    ...DEFAULT_FILTERS,
    category: searchParams.get("category") || "",
  });
  const [sort, setSort]           = useState(searchParams.get("sort") || "newest");
  const [viewMode, setViewMode]   = useState("grid");
  const [page, setPage]           = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen]   = useState(false);

  // Build query params
  const queryParams = {
    page, sort,
    category:  filters.category  || undefined,
    minPrice:  filters.priceRange?.min,
    maxPrice:  filters.priceRange?.max,
    brands:    filters.brands.join(",") || undefined,
    minRating: filters.rating || undefined,
    inStock:   filters.inStock || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["products", queryParams],
    queryFn:  () => productService.getAll(queryParams).then(r => r.data?.data ?? r.data),
    retry: false,
    placeholderData: { products: MOCK, total: 20, totalPages: 2 },
  });

  const products   = data?.products   || MOCK;
  const total      = data?.pagination?.total      || 20;
  const totalPages = data?.pagination?.totalPages || 2;

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSort("newest");
    setPage(1);
    setSearchParams({});
  };

  const handleSort = (val) => {
    setSort(val);
    setSortOpen(false);
    setPage(1);
  };

  // Active filters chips
  const activeFilters = [
    filters.category  && { key: "category",   label: filters.category },
    filters.priceRange && { key: "priceRange", label: filters.priceRange.label },
    ...filters.brands.map(b => ({ key: `brand-${b}`, label: b })),
    filters.rating    && { key: "rating",      label: `${filters.rating}★ & above` },
    filters.inStock   && { key: "inStock",      label: "In Stock" },
  ].filter(Boolean);

  const removeFilter = (key) => {
    if (key === "category")   setFilters(f => ({ ...f, category: "" }));
    if (key === "priceRange") setFilters(f => ({ ...f, priceRange: null }));
    if (key === "rating")     setFilters(f => ({ ...f, rating: 0 }));
    if (key === "inStock")    setFilters(f => ({ ...f, inStock: false }));
    if (key.startsWith("brand-")) {
      const b = key.replace("brand-", "");
      setFilters(f => ({ ...f, brands: f.brands.filter(x => x !== b) }));
    }
  };

  const currentSortLabel = SORT_OPTIONS.find(s => s.value === sort)?.label;

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: "Products" }]} />

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? "Loading..." : `${total} products found`}
          </p>
        </div>
      </div>

      {/* ── Active Filter Chips ── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {activeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => removeFilter(f.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50
                         text-primary text-xs font-medium rounded-full hover:bg-primary-100
                         transition-colors"
            >
              {f.label}
              <X size={12} />
            </button>
          ))}
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-danger underline px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 mb-5 bg-white rounded-xl
                      border border-gray-100 px-4 py-2.5 shadow-sm">
        {/* Mobile filter button */}
        <button
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700
                     hover:text-primary transition-colors lg:hidden"
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilters.length > 0 && (
            <Badge variant="primary">{activeFilters.length}</Badge>
          )}
        </button>

        <span className="hidden lg:block text-sm text-gray-500">
          Showing {products.length} of {total} products
        </span>

        <div className="flex items-center gap-3 ml-auto">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700
                         hover:text-primary transition-colors border border-gray-200
                         rounded-xl px-3 py-1.5"
            >
              <span className="hidden sm:inline text-gray-400">Sort:</span>
              {currentSortLabel}
              <ChevronDown size={14} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg
                                border border-gray-100 py-1 z-20">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleSort(opt.value)}
                      className={clsx(
                        "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                        sort === opt.value ? "text-primary font-medium bg-primary-50" : "text-gray-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View Mode */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-1.5 transition-colors",
                viewMode === "grid" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "p-1.5 transition-colors",
                viewMode === "list" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Layout: Sidebar + Grid ── */}
      <div className="flex gap-6">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <ProductFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
            />
          </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1 min-w-0">
          {!isLoading && products.length === 0 ? (
            <div className="py-20">
              <EmptyState
                title="No products found"
                description="Try adjusting your filters or search terms to find what you're looking for."
                buttonText="Clear all filters"
                onButtonClick={handleReset}
              />
            </div>
          ) : (
            <ProductGrid
              products={products}
              isLoading={isLoading}
              viewMode={viewMode}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>

      {/* ── Mobile Filter Drawer ── */}
      <Drawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        position="left"
        width="w-80"
      >
        <div className="p-4">
          <ProductFilters
            filters={filters}
            onChange={(f) => { handleFilterChange(f); }}
            onReset={() => { handleReset(); setFilterOpen(false); }}
            isMobile
          />
          <button
            onClick={() => setFilterOpen(false)}
            className="btn-primary w-full mt-4"
          >
            Show {total} Products
          </button>
        </div>
      </Drawer>

    </div>
  );
}

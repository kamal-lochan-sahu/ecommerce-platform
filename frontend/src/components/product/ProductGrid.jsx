import { LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";
import ProductCard from "./ProductCard";
import { ProductCardSkeleton } from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import Pagination from "../ui/Pagination";

export default function ProductGrid({
  products = [],
  isLoading = false,
  viewMode = "grid",
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  if (isLoading) {
    return (
      <div className={clsx(
        viewMode === "grid"
          ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          : "flex flex-col gap-3"
      )}>
        {Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        title="No products found"
        description="Try changing filters or modifying your search"
        actionLabel="Reset Filters"
      />
    );
  }

  return (
    <>
      <div className={clsx(
        viewMode === "grid"
          ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          : "flex flex-col gap-3"
      )}>
        {products.map((product) =>
          viewMode === "grid" ? (
            <ProductCard key={product._id} product={product} />
          ) : (
            <ListProductCard key={product._id} product={product} />
          )
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
}

function ListProductCard({ product }) {
  const { name, brand, price, comparePrice, images, ratings, totalReviews, discount } = product;
  const discountPct = discount || (comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0);

  return (
    <div className="card-hover flex gap-4 p-3">
      <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
        <img
          src={images?.[0] || "https://placehold.co/400x400?text=Product"}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        {brand && <p className="text-xs text-gray-400 uppercase">{brand}</p>}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5">{name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-amber-500">★</span>
          <span className="text-xs text-gray-600">{ratings} ({totalReviews})</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="font-bold text-gray-900">₹{price?.toLocaleString("en-IN")}</span>
          {comparePrice > price && (
            <span className="text-xs text-gray-400 line-through">₹{comparePrice?.toLocaleString("en-IN")}</span>
          )}
          {discountPct > 0 && (
            <span className="text-xs font-medium text-green-600">{discountPct}% off</span>
          )}
        </div>
      </div>
    </div>
  );
}

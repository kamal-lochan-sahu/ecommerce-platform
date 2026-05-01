import { clsx } from "clsx";

export default function Skeleton({ className = "", rounded = false }) {
  return (
    <div className={clsx(
      "animate-pulse bg-gray-200",
      rounded ? "rounded-full" : "rounded-lg",
      className
    )} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-3 space-y-3">
      <Skeleton className="w-full aspect-square" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-8" rounded />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="page-container space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

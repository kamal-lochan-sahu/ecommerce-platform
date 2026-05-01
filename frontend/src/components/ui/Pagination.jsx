import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;

  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      {pages[0] > 1 && (
        <>
          <PageBtn num={1} active={page === 1} onClick={onPageChange} />
          {pages[0] > 2 && <span className="px-1 text-gray-400">...</span>}
        </>
      )}

      {pages.map((n) => (
        <PageBtn key={n} num={n} active={n === page} onClick={onPageChange} />
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-gray-400">...</span>
          )}
          <PageBtn num={totalPages} active={page === totalPages} onClick={onPageChange} />
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function PageBtn({ num, active, onClick }) {
  return (
    <button
      onClick={() => onClick(num)}
      className={clsx(
        "w-9 h-9 rounded-xl text-sm font-medium transition-colors",
        active
          ? "bg-primary text-white"
          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
      )}
    >
      {num}
    </button>
  );
}

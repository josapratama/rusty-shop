import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "../../types";

interface Props {
  meta: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: Props) {
  if (!meta || meta.total_pages <= 1) return null;

  const pages = Array.from({ length: meta.total_pages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (p) =>
      p === 1 ||
      p === meta.total_pages ||
      (p >= meta.page - 2 && p <= meta.page + 2),
  );

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(meta.page - 1)}
        disabled={meta.page === 1}
        className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
      >
        <ChevronLeft size={16} />
      </button>

      {visiblePages.map((page, idx) => {
        const prev = visiblePages[idx - 1];
        return (
          <span key={page} className="flex items-center gap-1">
            {prev !== undefined && page - prev > 1 && (
              <span className="px-2 text-gray-400">...</span>
            )}
            <button
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === meta.page
                  ? "bg-primary-600 text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          </span>
        );
      })}

      <button
        onClick={() => onPageChange(meta.page + 1)}
        disabled={meta.page === meta.total_pages}
        className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

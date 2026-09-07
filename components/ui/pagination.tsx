import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`btn-secondary px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
          Prev
        </Link>
        <Link
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`btn-secondary px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        >
          Next
          <ChevronRight size={14} strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}

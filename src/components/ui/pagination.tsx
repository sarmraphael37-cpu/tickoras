import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (candidate) =>
      candidate === 1 ||
      candidate === totalPages ||
      Math.abs(candidate - page) <= 1,
  );

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:bg-brand-50 hover:text-accent-200",
          page === 1 && "pointer-events-none opacity-40",
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      {pages.map((candidate, index) => {
        const previous = pages[index - 1];
        const showEllipsis = previous && candidate - previous > 1;
        return (
          <span key={candidate} className="flex items-center">
            {showEllipsis ? (
              <span className="px-2 text-sm text-muted">…</span>
            ) : null}
            <Link
              href={buildHref(candidate)}
              aria-current={candidate === page ? "page" : undefined}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-[13px] font-medium transition",
                candidate === page
                  ? "bg-forest text-white"
                  : "text-muted hover:bg-brand-50 hover:text-accent-200",
              )}
            >
              {candidate}
            </Link>
          </span>
        );
      })}
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:bg-brand-50 hover:text-accent-200",
          page === totalPages && "pointer-events-none opacity-40",
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}

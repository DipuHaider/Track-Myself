"use client";

import { useState } from "react";

export const PAGE_SIZE = 10;

export function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return { page: safePage, setPage, totalPages, pageItems, startIndex, total, pageSize };
}

export function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export default function Pagination({
  page, totalPages, onChange, total, shown, noun = "entries", compact = false,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total: number;
  shown: number;
  noun?: string;
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-2 pt-1"
    >
      <p className="text-muted text-xs">
        Page {page} of {totalPages} · {shown} of {total} {noun}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className={`rounded-md border transition hover:bg-[var(--surface-2)] disabled:opacity-40 ${
            compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
          }`}
        >
          ← Prev
        </button>

        {pageNumbers(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="text-muted px-1.5 text-sm">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`rounded-md border transition ${
                compact ? "min-w-[1.75rem] px-1.5 py-1 text-xs" : "min-w-[2rem] px-2 py-1.5 text-sm"
              } ${p === page ? "btn-primary border-transparent" : "hover:bg-[var(--surface-2)]"}`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className={`rounded-md border transition hover:bg-[var(--surface-2)] disabled:opacity-40 ${
            compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
          }`}
        >
          Next →
        </button>
      </div>
    </nav>
  );
}

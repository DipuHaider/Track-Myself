import Link from "next/link";
import { Briefcase, Puzzle, SearchX } from "lucide-react";

export type EmptyStateMode = "first-run" | "no-matches";

export default function ApplicationsEmptyState({
  mode,
  onAdd,
  onClear,
}: {
  mode: EmptyStateMode;
  onAdd?: () => void;
  onClear?: () => void;
}) {
  if (mode === "no-matches") {
    return (
      <div className="surface flex flex-col items-center justify-center gap-3 rounded-lg border px-4 py-12 text-center">
        <span className="icon-chip status-wishlist">
          <SearchX size={16} aria-hidden="true" />
        </span>
        <p className="font-medium">No matches</p>
        <p className="text-muted max-w-sm text-sm">
          Nothing matches the current search and filters. Try a broader search or clear them.
        </p>
        {onClear && (
          <button type="button" onClick={onClear} className="btn-secondary rounded-md px-4 py-2 text-sm">
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="surface flex flex-col items-center justify-center gap-3 rounded-lg border px-4 py-12 text-center">
      <span className="icon-chip status-submitted">
        <Briefcase size={16} aria-hidden="true" />
      </span>
      <p className="font-medium">No applications yet</p>
      <p className="text-muted max-w-sm text-sm">
        Track every job you apply to in one place, and save postings straight from the browser with the extension.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onAdd && (
          <button type="button" onClick={onAdd} className="btn-primary rounded-md px-4 py-2 text-sm">
            + Add your first application
          </button>
        )}
        <Link href="/extension/connect" className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm">
          <Puzzle size={14} aria-hidden="true" /> Get the extension
        </Link>
      </div>
    </div>
  );
}

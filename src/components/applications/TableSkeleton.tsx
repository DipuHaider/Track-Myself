const WIDTHS = ["w-1/6", "w-1/4", "w-1/5", "w-1/6", "w-1/12", "w-1/6"];

export default function TableSkeleton({ rows = 5, label = "Loading applications" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="glass overflow-hidden rounded-lg">
      <span className="sr-only">{label}</span>
      <div className="surface-muted h-11" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t px-4 py-3.5">
          {WIDTHS.map((w, j) => (
            <div key={j} className={`h-3.5 ${w} animate-pulse rounded bg-[var(--surface-2)]`} />
          ))}
        </div>
      ))}
    </div>
  );
}

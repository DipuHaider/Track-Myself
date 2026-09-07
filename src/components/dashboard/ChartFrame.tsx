"use client";

import { Loader2 } from "lucide-react";

export default function ChartFrame({
  title, caption, loading, failed, empty, emptyLabel, children,
}: {
  title: string;
  caption?: string;
  loading?: boolean;
  failed?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-lg border p-4">
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        {caption && <p className="text-muted mt-0.5 text-xs">{caption}</p>}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 size={18} className="text-muted animate-spin" />
        </div>
      ) : failed ? (
        <p className="text-muted flex h-56 items-center justify-center text-sm">
          Could not load this data.
        </p>
      ) : empty ? (
        <p className="text-muted flex h-56 items-center justify-center text-sm">
          {emptyLabel ?? "No data yet."}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

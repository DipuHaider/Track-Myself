"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ListPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/applications/StatusBadge";
import { useTriage } from "@/hooks/useTriage";
import { apiFetch } from "@/lib/api/client";
import { attentionSummary, triageReason, type TriageRowView } from "@/lib/triageLabels";

function SkeletonRow() {
  return (
    <li className="surface-muted space-y-2 rounded-lg p-3">
      <div className="h-3.5 w-1/3 animate-pulse rounded bg-[var(--surface)]" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface)]" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--surface)]" />
    </li>
  );
}

function TriageRow({ row }: { row: TriageRowView }) {
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const addTodo = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/user/todos", { method: "POST", json: { title: `${row.company}: ${row.suggestion}`.slice(0, 300) } });
      setAdded(true);
      toast.success("Added to your to-do list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that to-do.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="surface-muted rounded-lg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {row.company}
            {row.jobTitle && <span className="text-muted font-normal"> — {row.jobTitle}</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <StatusBadge status={row.status} />
            {row.reasons.map((r) => {
              const look = triageReason(r);
              return <span key={r} className={`role-badge ${look.badge}`}>{look.label}</span>;
            })}
          </div>
        </div>
        <Link
          href={`/me/applications?open=${row.id}`}
          className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
        >
          Open <ExternalLink size={11} aria-hidden="true" />
        </Link>
      </div>
      {row.observed.length > 0 && (
        <ul className="text-muted mt-2 list-disc space-y-0.5 pl-4 text-xs">
          {row.observed.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      )}
      {row.suggestion && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">{row.suggestion}</p>
          <button
            type="button"
            onClick={() => void addTodo()}
            disabled={added || busy}
            className="btn-secondary inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs disabled:opacity-60"
          >
            <ListPlus size={12} aria-hidden="true" /> {added ? "Added" : busy ? "Adding…" : "Add as to-do"}
          </button>
        </div>
      )}
    </li>
  );
}

export default function TriagePanel() {
  const { preview, previewLoading, previewError, result, running, runError, run } = useTriage();
  const count = preview?.rows.length ?? 0;
  const paused = previewError?.status === 403 || previewError?.status === 423;
  if (paused) return null;

  return (
    <section className="surface rounded-xl border p-5" aria-labelledby="triage-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-chip status-active"><Sparkles size={16} aria-hidden="true" /></span>
          <div>
            <h2 id="triage-title" className="font-semibold">Review my applications</h2>
            <p className="text-muted text-xs">Uses your AI key if you have one, otherwise rules.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running || count === 0}
          className="btn-primary rounded-md px-4 py-2 text-sm"
        >
          {running ? "Reviewing…" : result ? "Review again" : "Review my applications"}
        </button>
      </div>

      <p className="text-muted mt-3 text-sm" aria-live="polite">
        {previewLoading ? "Checking your applications…" : previewError ? previewError.message : attentionSummary(count)}
      </p>

      {runError && <div className="alert alert-danger mt-3" role="alert">{runError.message}</div>}

      {running && (
        <ul className="mt-3 space-y-2" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Reviewing applications</span>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </ul>
      )}

      {result && !running && (
        <div className="mt-3 space-y-3">
          {result.mode === "rules" ? (
            <div className="alert alert-info">
              <span className="min-w-0 flex-1">
                {result.note}{" "}
                <Link href="/me/ai-key" className="font-medium underline underline-offset-2">Add an AI key</Link> for tailored suggestions.
              </span>
            </div>
          ) : (
            <p className="text-muted text-xs">{result.note}</p>
          )}
          {result.rows.length === 0 ? (
            <p className="text-muted text-sm">Nothing needs attention right now.</p>
          ) : (
            <ul className="space-y-2">
              {result.rows.map((row) => <TriageRow key={row.id} row={row} />)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

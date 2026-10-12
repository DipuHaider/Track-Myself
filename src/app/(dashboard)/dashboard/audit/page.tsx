"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import PermissionGate from "@/components/dashboard/PermissionGate";
import RelativeTime from "@/components/dashboard/RelativeTime";
import Loading, { InlineSpinner } from "@/components/shared/Spinner";
import Pagination from "@/components/shared/Pagination";
import { useAdminAudit, type AuditEntry } from "@/hooks/useAdminAudit";

const PAGE_LIMIT = 50;

const ACTION_TONE: Record<string, string> = {
  delete: "status-rejected",
  purge: "status-rejected",
  reset: "status-no-resp",
  restore: "status-offer",
  run: "status-active",
  resend: "status-interview",
};

function actionBadge(action: string) {
  const verb = action.split(".")[1] ?? "";
  return ACTION_TONE[verb] ?? "status-submitted";
}

function hasKeys(v: Record<string, unknown> | null) {
  return Boolean(v && Object.keys(v).length);
}

function Diff({ entry }: { entry: AuditEntry }) {
  if (!hasKeys(entry.before) && !hasKeys(entry.after)) {
    return <p className="text-muted text-xs">No field changes were recorded for this action.</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(["before", "after"] as const).map((side) => (
        <div key={side}>
          <p className="text-muted mb-1 text-[11px] font-medium uppercase tracking-wide">{side}</p>
          <pre className="surface-muted max-h-72 overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
            {hasKeys(entry[side]) ? JSON.stringify(entry[side], null, 2) : "—"}
          </pre>
        </div>
      ))}
      {entry.ip && <p className="text-muted text-[11px] md:col-span-2">From {entry.ip}</p>}
    </div>
  );
}

function AuditContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const action = searchParams.get("action") ?? "";
  const since = searchParams.get("since") ?? "";

  const [actorQuery, setActorQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const setParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const { entries, total, limit, actions, loading, validating, failed, error } = useAdminAudit({
    page, limit: PAGE_LIMIT, action, since: since ? new Date(since).toISOString() : undefined,
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const visible = useMemo(() => {
    const q = actorQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.actor.email.toLowerCase().includes(q));
  }, [entries, actorQuery]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hasFilters = Boolean(action || since || actorQuery);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <History size={22} aria-hidden="true" /> Audit log
          </h2>
          <p className="text-muted mt-0.5 text-sm">
            Every administrative change: who did it, to what, and what the values were before and after.
          </p>
        </div>
        <p className="text-muted text-sm">
          {loading ? <InlineSpinner /> : `${total} ${hasFilters ? "matching" : "entries"}`}
          {validating && !loading && <InlineSpinner label="Refreshing" />}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={action}
          onChange={(e) => setParams({ action: e.target.value, page: null })}
          aria-label="Filter by action"
          className="surface rounded-md border px-2 py-2 text-sm"
        >
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <input
          type="search"
          value={actorQuery}
          onChange={(e) => setActorQuery(e.target.value)}
          placeholder="Actor email (this page)"
          aria-label="Filter by actor email on this page"
          className="surface w-full max-w-xs rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />

        <label className="text-muted flex items-center gap-2 text-xs">
          Since
          <input
            type="date"
            value={since}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setParams({ since: e.target.value, page: null })}
            aria-label="Only entries since this date"
            className="surface rounded-md border px-2 py-1.5 text-sm"
          />
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setActorQuery(""); setParams({ action: null, since: null, page: null }); }}
            className="text-muted text-sm hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {failed && (
        <p role="alert" className="alert alert-danger">{error?.message ?? "Could not load the audit log."}</p>
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="glass hidden overflow-hidden rounded-lg md:block">
            <table className="w-full text-left text-sm">
              <thead className="surface-muted">
                <tr>
                  <th className="w-8 px-2 py-3"><span className="sr-only">Details</span></th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const expanded = open.has(entry._id);
                  return (
                    <AuditRows key={entry._id} entry={entry} expanded={expanded} onToggle={() => toggle(entry._id)} />
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td className="text-muted px-4 py-8" colSpan={5}>
                      {hasFilters ? "No entries match these filters." : "Nothing has been recorded yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {visible.map((entry) => {
              const expanded = open.has(entry._id);
              return (
                <li key={entry._id} className="glass rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => toggle(entry._id)}
                    aria-expanded={expanded}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 space-y-1">
                      <span className={`role-badge ${actionBadge(entry.action)}`}>{entry.action}</span>
                      <p className="truncate text-sm font-medium">{entry.targetLabel || entry.targetId || "—"}</p>
                      <p className="text-muted truncate text-xs">
                        {entry.actor.email || "system"} · <RelativeTime value={entry.at} />
                      </p>
                    </div>
                    {expanded ? <ChevronDown size={16} className="text-muted shrink-0" aria-hidden="true" /> : <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />}
                  </button>
                  {expanded && <div className="mt-3 border-t pt-3"><Diff entry={entry} /></div>}
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="glass text-muted rounded-lg p-6 text-center text-sm">
                {hasFilters ? "No entries match these filters." : "Nothing has been recorded yet."}
              </li>
            )}
          </ul>
        </>
      )}

      <Pagination
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        onChange={(p) => setParams({ page: p === 1 ? null : String(p) })}
        total={total}
        shown={entries.length}
        noun="entries"
      />
    </div>
  );
}

function AuditRows({ entry, expanded, onToggle }: { entry: AuditEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-t transition hover:bg-[var(--surface-2)]">
        <td className="px-2 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide details" : "Show details"}
            className="text-muted rounded p-1 transition hover:bg-[var(--surface-2)]"
          >
            {expanded ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
          </button>
        </td>
        <td className="text-muted whitespace-nowrap px-4 py-3"><RelativeTime value={entry.at} /></td>
        <td className="px-4 py-3">{entry.actor.email || <span className="text-muted">system</span>}</td>
        <td className="px-4 py-3"><span className={`role-badge ${actionBadge(entry.action)}`}>{entry.action}</span></td>
        <td className="px-4 py-3">
          <p className="font-medium">{entry.targetLabel || "—"}</p>
          {(entry.targetType || entry.targetId) && (
            <p className="text-muted font-mono text-[11px]">{[entry.targetType, entry.targetId].filter(Boolean).join(" · ")}</p>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t">
          <td colSpan={5} className="surface px-4 py-3"><Diff entry={entry} /></td>
        </tr>
      )}
    </>
  );
}

export default function AuditPage() {
  return (
    <PermissionGate action="view:audit">
      <Suspense fallback={<Loading />}>
        <AuditContent />
      </Suspense>
    </PermissionGate>
  );
}

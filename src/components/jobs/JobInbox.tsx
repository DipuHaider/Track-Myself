"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Check, ExternalLink, Loader2, MapPin, RefreshCw, Search, Sparkles, Star, X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { refreshLeads, useLeadSummary, useLeads } from "@/hooks/useJobHunt";
import { DeadlineBadge, FitChip, LeadStatusBadge, postedLabel } from "@/components/jobs/LeadBadges";
import TargetProgress, { TARGET_LABELS } from "@/components/jobs/TargetProgress";
import { TARGET_PLATFORMS } from "@/lib/jobs/settings";
import type { LeadView } from "@/lib/jobs/leads";

const STATUS_TABS = [
  { key: "open", label: "Open" },
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "ready", label: "Ready" },
  { key: "submitted", label: "Submitted" },
  { key: "dismissed", label: "Dismissed" },
  { key: "expired", label: "Expired" },
] as const;

const SORTS = [
  { key: "fit", label: "Best fit" },
  { key: "new", label: "Newest" },
  { key: "deadline", label: "Deadline" },
] as const;

type HuntResult = { created: number; merged: number; tracked: number; tooOld: number; errors: string[] };

export default function JobInbox() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status") ?? "open";
  const platform = params.get("platform") ?? "";
  const sort = params.get("sort") ?? "fit";
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const query = useMemo(() => {
    const p = new URLSearchParams({ status, sort, page: String(page), limit: "20" });
    if (platform) p.set("platform", platform);
    if (q) p.set("q", q);
    return p.toString();
  }, [status, platform, sort, q, page]);

  const { page: data, loading, validating } = useLeads(query);
  const { summary } = useLeadSummary();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [term, setTerm] = useState(q);

  const setParam = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setSelected(new Set());
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const refresh = async () => {
    setBusy("refresh");
    try {
      const res = await apiFetch<HuntResult>("/api/user/job-hunt/refresh", { method: "POST" });
      await refreshLeads();
      const parts = [`${res.created} new`];
      if (res.merged) parts.push(`${res.merged} merged`);
      if (res.tracked) parts.push(`${res.tracked} already tracked`);
      if (res.tooOld) parts.push(`${res.tooOld} older than your window`);
      toast.success(`Search finished: ${parts.join(", ")}.`);
      if (res.errors.length) toast.warning(res.errors[0]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "The search failed.");
    } finally {
      setBusy(null);
    }
  };

  const act = async (ids: string[], action: "shortlist" | "dismiss" | "restore") => {
    setBusy(action);
    try {
      const res = await apiFetch<{ changed: number; errors: string[] }>("/api/user/leads/bulk", { method: "POST", json: { ids, action } });
      await refreshLeads();
      setSelected(new Set());
      const verb = action === "shortlist" ? "Shortlisted" : action === "dismiss" ? "Dismissed" : "Restored";
      toast.success(`${verb} ${res.changed} job${res.changed === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  };

  const prepare = async (ids: string[]) => {
    setBusy("prepare");
    let ok = 0;
    const toastId = toast.loading(`Preparing 1 of ${ids.length}…`);
    for (const [i, id] of ids.entries()) {
      toast.loading(`Preparing ${i + 1} of ${ids.length}: tailoring the CV and writing the letter…`, { id: toastId });
      try {
        await apiFetch(`/api/user/leads/${id}/prepare`, { method: "POST", json: {} });
        ok++;
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Preparation failed.");
        if (err instanceof ApiError && err.status === 429) break;
      }
      await refreshLeads();
    }
    toast.success(`${ok} application${ok === 1 ? "" : "s"} ready for review.`, { id: toastId });
    setSelected(new Set());
    setBusy(null);
  };

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((l) => selected.has(l._id));
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const chosen = [...selected];

  return (
    <div className="space-y-5">
      <section className="surface rounded-xl border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Today</h2>
            {summary && (
              <p className="text-muted text-sm">
                {summary.totals.fresh} new · {summary.totals.ready} ready for review · {summary.totals.submittedToday} of{" "}
                {summary.totals.target} applied
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={busy !== null}
            className="btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:opacity-60"
          >
            {busy === "refresh" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
            Search now
          </button>
        </div>
        {summary ? <TargetProgress summary={summary} /> : <div className="progress-track" />}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Lead status" className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={status === t.key}
              onClick={() => setParam({ status: t.key })}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={status === t.key ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <form
          className="relative min-w-[12rem] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: term.trim() });
          }}
        >
          <label htmlFor="lead-search" className="sr-only">Search jobs</label>
          <Search size={14} className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" aria-hidden="true" />
          <input
            id="lead-search"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Company, title or place"
            className="w-full rounded-md border py-2 pr-3 pl-8 text-sm"
          />
        </form>
        <div>
          <label htmlFor="lead-platform" className="sr-only">Platform</label>
          <select id="lead-platform" value={platform} onChange={(e) => setParam({ platform: e.target.value })} className="rounded-md border px-3 py-2 text-sm">
            <option value="">All platforms</option>
            {TARGET_PLATFORMS.map((p) => <option key={p} value={p}>{TARGET_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lead-sort" className="sr-only">Sort</label>
          <select id="lead-sort" value={sort} onChange={(e) => setParam({ sort: e.target.value })} className="rounded-md border px-3 py-2 text-sm">
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="surface-muted flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm" role="region" aria-label="Bulk actions">
          <span className="px-2 font-medium">{chosen.length} selected</span>
          <button type="button" disabled={busy !== null} onClick={() => prepare(chosen)} className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm">
            <Sparkles size={14} aria-hidden="true" /> Prepare
          </button>
          <button type="button" disabled={busy !== null} onClick={() => act(chosen, "shortlist")} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm">
            <Star size={14} aria-hidden="true" /> Shortlist
          </button>
          <button type="button" disabled={busy !== null} onClick={() => act(chosen, "dismiss")} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm">
            <X size={14} aria-hidden="true" /> Dismiss
          </button>
        </div>
      )}

      {loading && !data ? (
        <ul className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <li key={i} className="surface h-24 animate-pulse rounded-xl border" />)}
        </ul>
      ) : items.length === 0 ? (
        <EmptyInbox status={status} />
      ) : (
        <>
          <label className="text-muted flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((l) => l._id)))}
            />
            Select all on this page
          </label>
          <ul className="space-y-2" aria-busy={validating}>
            {items.map((lead) => (
              <LeadRow
                key={lead._id}
                lead={lead}
                checked={selected.has(lead._id)}
                onToggle={() => toggle(lead._id)}
                disabled={busy !== null}
                onAction={(a) => (a === "prepare" ? prepare([lead._id]) : act([lead._id], a))}
              />
            ))}
          </ul>
        </>
      )}

      {data && data.total > data.limit && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <button type="button" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })} className="btn-secondary rounded-md px-3 py-1.5 disabled:opacity-50">
            Previous
          </button>
          <span className="text-muted">Page {page} of {Math.ceil(data.total / data.limit)}</span>
          <button type="button" disabled={!data.hasMore} onClick={() => setParam({ page: String(page + 1) })} className="btn-secondary rounded-md px-3 py-1.5 disabled:opacity-50">
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

function LeadRow({
  lead, checked, onToggle, onAction, disabled,
}: {
  lead: LeadView;
  checked: boolean;
  onToggle: () => void;
  onAction: (a: "shortlist" | "dismiss" | "restore" | "prepare") => void;
  disabled: boolean;
}) {
  const gaps = lead.fitGaps.slice(0, 3).map((g) => g.requirement).filter(Boolean);
  const canPrepare = ["new", "shortlisted", "failed"].includes(lead.status);
  return (
    <li className="surface flex gap-3 rounded-xl border p-4">
      <input type="checkbox" className="mt-1" checked={checked} onChange={onToggle} aria-label={`Select ${lead.title} at ${lead.company}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/me/jobs/${lead._id}`} className="font-medium hover:underline">{lead.title}</Link>
            <p className="text-muted text-sm">
              {lead.company}
              {lead.location && (
                <span className="ml-2 inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{lead.location}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FitChip score={lead.fitScore} mode={lead.fitMode} />
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>
        <div className="text-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>{postedLabel(lead.postedAt, lead.postedAgeText)}</span>
          <DeadlineBadge deadline={lead.deadline} />
          <span>{lead.platform}</span>
          {lead.salary && <span>{lead.salary}</span>}
          {gaps.length > 0 && <span>Not in your CV: {gaps.join(", ")}</span>}
        </div>
        {lead.error && <p className="text-danger mt-2 text-xs">{lead.error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {canPrepare && (
            <button type="button" disabled={disabled} onClick={() => onAction("prepare")} className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
              <Sparkles size={13} aria-hidden="true" /> Prepare
            </button>
          )}
          {["ready", "applying"].includes(lead.status) && (
            <Link href={`/me/jobs/${lead._id}`} className="btn-primary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
              <Check size={13} aria-hidden="true" /> Review and apply
            </Link>
          )}
          {lead.status === "new" && (
            <button type="button" disabled={disabled} onClick={() => onAction("shortlist")} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
              <Star size={13} aria-hidden="true" /> Shortlist
            </button>
          )}
          {["dismissed", "expired"].includes(lead.status) ? (
            <button type="button" disabled={disabled} onClick={() => onAction("restore")} className="btn-secondary rounded-md px-3 py-1.5 text-xs">Restore</button>
          ) : lead.status !== "submitted" && (
            <button type="button" disabled={disabled} onClick={() => onAction("dismiss")} className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
              <X size={13} aria-hidden="true" /> Dismiss
            </button>
          )}
          <a href={lead.url} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs">
            <ExternalLink size={13} aria-hidden="true" /> Posting
          </a>
        </div>
      </div>
    </li>
  );
}

function EmptyInbox({ status }: { status: string }) {
  return (
    <div className="surface rounded-xl border p-8 text-center">
      <p className="font-medium">{status === "open" || status === "new" ? "No new jobs yet" : "Nothing here"}</p>
      <p className="text-muted mx-auto mt-1 max-w-md text-sm">
        {status === "open" || status === "new"
          ? "Add a saved search and press Search now, or wait for the morning run. Jobs you send from LinkedIn, XING or StepStone with the extension land here too."
          : "Try another tab or clear the filters."}
      </p>
      <Link href="/me/jobs/searches" className="btn-secondary mt-4 inline-flex rounded-md px-4 py-2 text-sm">Manage saved searches</Link>
    </div>
  );
}

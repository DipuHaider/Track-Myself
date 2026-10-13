"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ApplicationFormModal from "@/components/applications/ApplicationFormModal";
import ViewApplicationModal from "@/components/applications/ViewApplicationModal";
import RecentlyDeletedModal from "@/components/applications/RecentlyDeletedModal";
import ApplicationTable, { type QuickField } from "@/components/applications/ApplicationTable";
import Loading, { InlineSpinner } from "@/components/shared/Spinner";
import Pagination from "@/components/shared/Pagination";
import { useApplicationFilters } from "@/hooks/useApplicationFilters";
import { useApplicationsPage } from "@/hooks/useApplicationsPage";
import { useApplicationStats } from "@/hooks/useApplicationStats";
import { apiFetch, type ApiError } from "@/lib/api/client";
import {
  APPLICATION_FLAGS, APPLICATION_SORTS, FLAG_LABELS, PRIORITIES, SORT_LABELS, type ApplicationFlag, type ApplicationSort,
} from "@/lib/applicationQuery";
import type { DuplicateKind } from "@/lib/applicationFlags";
import { JOB_TYPES } from "@/constants/applicationStatus";
import StatusOptions from "@/components/applications/StatusOptions";
import type { Application } from "@/types/application";

const SELECT = "surface rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";
const SEARCH_DEBOUNCE_MS = 300;

function PortalApplicationsContent() {
  const { filters, set, clear, activeCount, isFiltered } = useApplicationFilters();
  const page = useApplicationsPage(filters);
  const { stats, paused } = useApplicationStats();
  const { items, total, limit, loading, validating, error, addApplication, updateApplication, removeApplication, patchApplication } = page;

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Application | null>(null);
  const [editLoading, setEditLoading] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState(filters.q);
  const [syncedQ, setSyncedQ] = useState(filters.q);
  const [pushedQ, setPushedQ] = useState(filters.q);
  const searchTimer = useRef<number | null>(null);
  /* The URL is the source of truth for q, but it must not overwrite what the
     user is still typing: only an external change (Clear, back button, a
     stats-card link) resets the box. */
  if (filters.q !== syncedQ) {
    setSyncedQ(filters.q);
    if (filters.q !== pushedQ) setSearch(filters.q);
  }
  const onSearch = (value: string) => {
    setSearch(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setPushedQ(value.trim());
      set({ q: value.trim() });
    }, SEARCH_DEBOUNCE_MS);
  };
  useEffect(() => () => { if (searchTimer.current) window.clearTimeout(searchTimer.current); }, []);

  const rowOnPage = useMemo(
    () => (filters.open ? page.rawItems.find((a) => a._id === filters.open) ?? null : null),
    [filters.open, page.rawItems],
  );
  const { data: openRecord, error: openError } = useSWR<Application, ApiError>(
    filters.open ? `/api/applications/${filters.open}` : null,
    { revalidateOnFocus: false },
  );
  useEffect(() => {
    if (openError && !rowOnPage) {
      toast.error(openError.status === 404 ? "That application is no longer here." : openError.message);
      set({ open: "", tab: "" });
    }
  }, [openError, rowOnPage, set]);
  const viewTarget = filters.open ? openRecord ?? rowOnPage : null;

  const duplicateKinds = useMemo(() => {
    const map = new Map<string, DuplicateKind>();
    for (const row of page.rawItems) if (row.duplicateKind) map.set(row._id, row.duplicateKind);
    return map;
  }, [page.rawItems]);
  const duplicateIds = useMemo(() => new Set(duplicateKinds.keys()), [duplicateKinds]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (filters.page - 1) * limit;
  const trashCount = stats?.trashCount ?? 0;

  const openEdit = async (app: Application) => {
    setEditLoading(app._id);
    try {
      setEditTarget(await apiFetch<Application>(`/api/applications/${app._id}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load that application.");
    } finally {
      setEditLoading(null);
    }
  };

  const undoDelete = async (app: Application) => {
    try {
      addApplication(await apiFetch<Application>(`/api/applications/trash/${app._id}`, { method: "POST" }));
      toast.success(`"${app.jobTitle}" restored`);
    } catch {
      toast.error("Could not restore that application.");
    }
  };

  const handleDelete = async (app: Application) => {
    setDeletingId(app._id);
    try {
      await apiFetch(`/api/applications/${app._id}`, { method: "DELETE" });
    } catch (err) {
      setDeletingId(null);
      toast.error(err instanceof Error ? err.message : "Could not delete that application.");
      return;
    }
    setDeletingId(null);
    removeApplication(app._id);
    if (filters.open === app._id) set({ open: "", tab: "" });
    toast(`"${app.jobTitle}" moved to Recently deleted`, {
      description: `${app.companyName} · restorable for 30 days`,
      duration: 8000,
      action: { label: "Undo", onClick: () => { void undoDelete(app); } },
    });
  };

  const handleQuickUpdate = async (id: string, field: QuickField, value: string | boolean) => {
    const patch: Partial<Application> =
      field === "favourite" || field === "isGhostJob"
        ? { [field]: Boolean(value) }
        : { [field]: (value as string) || null };
    try {
      await patchApplication(id, patch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that change.");
    }
  };

  const visibleItems = deletingId ? items.filter((a) => a._id !== deletingId) : items;
  const emptyState = !loading && visibleItems.length === 0
    ? (isFiltered || (stats?.total ?? total) > 0 ? "no-matches" : "first-run")
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My Applications</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTrashOpen(true)}
            className="btn-secondary inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm"
          >
            <Trash2 size={14} aria-hidden="true" /> Recently deleted
            {trashCount > 0 && (
              <span className="rounded-full bg-[var(--surface-2)] px-1.5 text-xs font-medium">{trashCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={paused}
            className="btn-primary rounded-md px-4 py-2 text-sm"
          >
            + New Application
          </button>
        </div>
      </div>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <label htmlFor="applications-search" className="sr-only">Search applications</label>
          <Search size={14} className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="applications-search"
            type="search"
            className={`${SELECT} w-full pl-8`}
            placeholder="Search company, role, notes…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>

        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          className={`${SELECT} ${filters.status ? "border-[var(--primary)]" : ""}`}
        >
          <option value="">All Statuses</option>
          <StatusOptions />
        </select>

        <select
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(e) => set({ priority: e.target.value })}
          className={`${SELECT} ${filters.priority ? "border-[var(--primary)]" : ""}`}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          aria-label="Filter by job type"
          value={filters.type}
          onChange={(e) => set({ type: e.target.value })}
          className={`${SELECT} ${filters.type ? "border-[var(--primary)]" : ""}`}
        >
          <option value="">All Job Types</option>
          {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          aria-label="Filter by flag"
          value={filters.flag}
          onChange={(e) => set({ flag: e.target.value as ApplicationFlag | "" })}
          className={`${SELECT} ${filters.flag ? "border-[var(--primary)]" : ""}`}
        >
          <option value="">All Flags</option>
          {APPLICATION_FLAGS.map((f) => <option key={f} value={f}>{FLAG_LABELS[f]}</option>)}
        </select>

        <select
          aria-label="Sort applications"
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as ApplicationSort })}
          className={SELECT}
        >
          {APPLICATION_SORTS.map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
        </select>

        {isFiltered && (
          <button type="button" onClick={clear} className="text-muted text-sm hover:underline">
            Clear{activeCount > 0 ? ` (${activeCount} filter${activeCount > 1 ? "s" : ""})` : ""}
          </button>
        )}

        <p className="text-muted ml-auto text-sm" aria-live="polite">
          {loading ? (
            <InlineSpinner />
          ) : (
            <>
              {total} result{total !== 1 ? "s" : ""}{isFiltered ? " (filtered)" : ""}
              {validating && <span className="ml-2 inline-flex align-middle"><InlineSpinner label="Refreshing" /></span>}
            </>
          )}
        </p>
      </form>


      {error && !loading && (
        <div className="alert alert-danger" role="alert">
          {error.status === 423 || error.status === 403
            ? "Tracking is paused, so the list cannot be loaded. Resume it from your account settings."
            : error.message}
        </div>
      )}

      <ApplicationTable
        applications={visibleItems}
        startIndex={startIndex}
        loading={loading}
        emptyState={emptyState}
        onAdd={paused ? undefined : () => setAddOpen(true)}
        onClearFilters={clear}
        onView={(app) => set({ open: app._id })}
        onEdit={paused ? undefined : (app) => void openEdit(app)}
        onDelete={paused ? undefined : handleDelete}
        onQuickUpdate={paused ? undefined : handleQuickUpdate}
        duplicateIds={duplicateIds}
        duplicateKinds={duplicateKinds}
      />

      {editLoading && (
        <p className="text-muted text-xs" role="status" aria-live="polite">
          <InlineSpinner /> <span className="ml-1 align-middle">Opening editor…</span>
        </p>
      )}

      {!loading && (
        <Pagination
          page={Math.min(filters.page, totalPages)}
          totalPages={totalPages}
          onChange={(p) => set({ page: p })}
          total={total}
          shown={visibleItems.length}
          noun="applications"
        />
      )}

      <ApplicationFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(app) => { addApplication(app); setAddOpen(false); }}
        applications={page.rawItems}
      />
      {editTarget && (
        <ApplicationFormModal
          open
          onClose={() => setEditTarget(null)}
          onSaved={(app) => { updateApplication(app); setEditTarget(null); }}
          application={editTarget}
          applications={page.rawItems}
        />
      )}
      {trashOpen && (
        <RecentlyDeletedModal<Application>
          open
          onClose={() => setTrashOpen(false)}
          endpoint="/api/applications/trash"
          onRestored={(app) => { addApplication(app); toast.success(`"${app.jobTitle}" restored`); }}
        />
      )}

      <ViewApplicationModal
        open={!!viewTarget}
        onClose={() => set({ open: "", tab: "" })}
        application={viewTarget}
        interviewsOpen={filters.tab === "interviews"}
      />
    </div>
  );
}

export default function PortalApplicationsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PortalApplicationsContent />
    </Suspense>
  );
}

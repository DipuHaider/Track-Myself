"use client";

import { useMemo, useState } from "react";
import ApplicationFormModal from "@/components/applications/ApplicationFormModal";
import ViewApplicationModal from "@/components/applications/ViewApplicationModal";
import ApplicationTable from "@/components/applications/ApplicationTable";
import { useApplications } from "@/hooks/useApplications";
import type { Application } from "@/types/application";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";
import type { QuickField } from "@/components/applications/ApplicationTable";
import { computeDuplicateIds, isPossibleGhost } from "@/lib/applicationFlags";

const PAGE_SIZE = 10;

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export default function PortalApplicationsPage() {
  const { applications, loading, addApplication, updateApplication, removeApplication } =
    useApplications();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Application | null>(null);
  const [viewTarget, setViewTarget] = useState<Application | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterGhost, setFilterGhost] = useState<"" | "auto" | "manual">("");
  const [filterDuplicates, setFilterDuplicates] = useState(false);
  const [page, setPage] = useState(1);

  const duplicateIds = useMemo(() => computeDuplicateIds(applications), [applications]);

  const filtered = useMemo(() => {
    let result = applications;
    if (filterStatus)           result = result.filter((a) => a.applicationStatus === filterStatus);
    if (filterPriority)         result = result.filter((a) => a.priority === filterPriority);
    if (filterGhost === "auto") result = result.filter(isPossibleGhost);
    if (filterGhost === "manual") result = result.filter((a) => !!a.isGhostJob);
    if (filterDuplicates)       result = result.filter((a) => duplicateIds.has(a._id));
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((app) =>
        [app.companyName, app.jobTitle, app.platform, app.location, app.country,
          app.applicationStatus, app.notes, app.salary, app.contactNumber]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [applications, search, filterStatus, filterPriority, filterGhost, filterDuplicates, duplicateIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);
  const onSearch = (v: string) => { setSearch(v); resetPage(); };
  const onFilterStatus = (v: string) => { setFilterStatus(v); resetPage(); };
  const onFilterPriority = (v: string) => { setFilterPriority(v); resetPage(); };

  const clearAll = () => {
    onSearch(""); onFilterStatus(""); onFilterPriority("");
    setFilterGhost(""); setFilterDuplicates(false);
  };

  const handleDelete = async (app: Application) => {
    if (!confirm(`Delete application for "${app.jobTitle}" at ${app.companyName}?`)) return;
    setDeletingId(app._id);
    const res = await fetch(`/api/applications/${app._id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) removeApplication(app._id);
  };

  const handleQuickUpdate = async (id: string, field: QuickField, value: string | boolean) => {
    const body =
      field === "favourite" || field === "isGhostJob"
        ? { [field]: value }
        : { [field]: (value as string) || null };
    const res = await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated: Application = await res.json();
      updateApplication(updated);
    }
  };

  const activeFilters =
    (filterStatus ? 1 : 0) +
    (filterPriority ? 1 : 0) +
    (filterGhost ? 1 : 0) +
    (filterDuplicates ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My Applications</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn-primary rounded-md px-4 py-2 text-sm"
        >
          + New Application
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          className="surface w-full max-w-sm rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          placeholder="Search company, role, location, status…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatus(e.target.value)}
          className={`surface rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] ${
            filterStatus ? "border-[var(--primary)]" : ""
          }`}
        >
          <option value="">All Statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => onFilterPriority(e.target.value)}
          className={`surface rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] ${
            filterPriority ? "border-[var(--primary)]" : ""
          }`}
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Ghost filter */}
        <select
          value={filterGhost}
          onChange={(e) => { setFilterGhost(e.target.value as "" | "auto" | "manual"); resetPage(); }}
          className={`surface rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] ${
            filterGhost ? "border-[var(--primary)]" : ""
          }`}
        >
          <option value="">All Ghost States</option>
          <option value="auto">Possible Ghost (45+ days)</option>
          <option value="manual">Confirmed Ghost</option>
        </select>

        {/* Duplicates filter */}
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={filterDuplicates}
            onChange={(e) => { setFilterDuplicates(e.target.checked); resetPage(); }}
            className="rounded accent-[var(--primary)]"
          />
          Duplicates only
        </label>

        {(search || activeFilters > 0) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-muted text-sm hover:underline"
          >
            Clear{activeFilters > 0 ? ` (${activeFilters} filter${activeFilters > 1 ? "s" : ""})` : ""}
          </button>
        )}

        <p className="text-muted ml-auto text-sm">
          {loading
            ? "Loading…"
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}${
                search || activeFilters > 0 ? " (filtered)" : ""
              }`}
        </p>
      </div>

      {/* Table */}
      <ApplicationTable
        applications={deletingId ? pageItems.filter((a) => a._id !== deletingId) : pageItems}
        startIndex={(safePage - 1) * PAGE_SIZE}
        onView={(app) => setViewTarget(app)}
        onEdit={(app) => setEditTarget(app)}
        onDelete={handleDelete}
        onQuickUpdate={handleQuickUpdate}
        duplicateIds={duplicateIds}
      />

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted text-sm">
            Page {safePage} of {totalPages} · {pageItems.length} of {filtered.length} shown
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              ← Prev
            </button>
            {pageNumbers(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="text-muted px-2 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[2rem] rounded-md border px-2 py-1.5 text-sm transition ${
                    p === safePage ? "btn-primary border-transparent" : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ApplicationFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(app) => { addApplication(app); setAddOpen(false); }}
        applications={applications}
      />
      <ApplicationFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(app) => { updateApplication(app); setEditTarget(null); }}
        application={editTarget ?? undefined}
        applications={applications}
      />
      <ViewApplicationModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        application={viewTarget}
      />
    </div>
  );
}

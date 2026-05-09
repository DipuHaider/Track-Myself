"use client";

import { useMemo, useState } from "react";
import ApplicationTable from "@/components/applications/ApplicationTable";
import ApplicationFormModal from "@/components/applications/ApplicationFormModal";
import ViewApplicationModal from "@/components/applications/ViewApplicationModal";
import { useApplications } from "@/hooks/useApplications";
import type { Application } from "@/types/application";

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

export default function ApplicationsPage() {
  const { applications, loading, addApplication, updateApplication, removeApplication } = useApplications();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Application | null>(null);
  const [viewTarget, setViewTarget] = useState<Application | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* ── search + pagination ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return applications;
    return applications.filter((app) =>
      [app.companyName, app.jobTitle, app.platform, app.location, app.country,
       app.applicationStatus, app.notes, app.salary, app.contactNumber]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q)),
    );
  }, [applications, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const onSearch = (v: string) => { setSearch(v); setPage(1); };

  /* ── actions ── */
  const handleDelete = async (app: Application) => {
    if (!confirm(`Delete application for "${app.jobTitle}" at ${app.companyName}?`)) return;
    setDeletingId(app._id);
    const res = await fetch(`/api/applications/${app._id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) removeApplication(app._id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Applications</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn-primary rounded-md px-4 py-2 text-sm"
        >
          + New Application
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          className="surface w-full max-w-sm rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          placeholder="Search company, role, location, status…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button type="button" onClick={() => onSearch("")} className="text-muted text-sm hover:underline">
            Clear
          </button>
        )}
        <p className="text-muted ml-auto text-sm">
          {loading
            ? "Loading…"
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}${search ? ` for "${search}"` : ""}`}
        </p>
      </div>

      {/* Table */}
      <ApplicationTable
        applications={deletingId ? pageItems.filter((a) => a._id !== deletingId) : pageItems}
        onView={(app) => setViewTarget(app)}
        onEdit={(app) => setEditTarget(app)}
        onDelete={handleDelete}
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

      {/* Add modal */}
      <ApplicationFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(app) => { addApplication(app); setAddOpen(false); }}
      />

      {/* Edit modal */}
      <ApplicationFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(app) => { updateApplication(app); setEditTarget(null); }}
        application={editTarget ?? undefined}
      />

      {/* View modal */}
      <ViewApplicationModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        application={viewTarget}
      />
    </div>
  );
}

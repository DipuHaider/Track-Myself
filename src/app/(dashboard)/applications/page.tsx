"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ApplicationTable, { type QuickField } from "@/components/applications/ApplicationTable";
import ApplicationFormModal from "@/components/applications/ApplicationFormModal";
import ViewApplicationModal from "@/components/applications/ViewApplicationModal";
import PermissionGate from "@/components/dashboard/PermissionGate";
import { useAllApplications, type AdminApplication } from "@/hooks/useAllApplications";
import { usePermissions } from "@/hooks/usePermissions";
import { computeDuplicateIds } from "@/lib/applicationFlags";
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

function ApplicationsContent() {
  const initialQuery = useSearchParams().get("q") ?? "";
  const {
    applications, loading, failed,
    updateApplication, patchApplication, removeApplication,
  } = useAllApplications();
  const { can } = usePermissions();

  const canEdit = can("edit:applications");
  const canDelete = can("delete:applications");

  const [editTarget, setEditTarget] = useState<AdminApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminApplication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(initialQuery);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [page, setPage] = useState(1);

  const owners = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const app of applications) {
      if (!app.owner) continue;
      const entry = map.get(app.owner._id) ?? {
        id: app.owner._id,
        label: `${app.owner.name} · ${app.owner.email}`,
        count: 0,
      };
      entry.count++;
      map.set(app.owner._id, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return applications.filter((app) => {
      if (ownerFilter && app.owner?._id !== ownerFilter) return false;
      if (!q) return true;
      return [
        app.companyName, app.jobTitle, app.platform, app.location, app.country,
        app.applicationStatus, app.notes, app.salary, app.contactNumber,
        app.owner?.name, app.owner?.email,
      ]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    });
  }, [applications, search, ownerFilter]);

  const duplicateIds = useMemo(() => computeDuplicateIds(filtered), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onSearch = (v: string) => { setSearch(v); setPage(1); };
  const onOwner = (v: string) => { setOwnerFilter(v); setPage(1); };

  async function handleQuickUpdate(id: string, field: QuickField, value: string | boolean) {
    setError("");
    const previous = applications.find((a) => a._id === id);
    patchApplication(id, { [field]: value } as Partial<Application>);

    const res = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      if (previous) patchApplication(id, { [field]: previous[field] } as Partial<Application>);
      setError("Could not update that application.");
    }
  }

  async function handleDelete(app: Application) {
    const owner = (app as AdminApplication).owner;
    const who = owner ? ` (owned by ${owner.name})` : "";
    if (!confirm(`Delete "${app.jobTitle}" at ${app.companyName}${who}? This cannot be undone.`)) return;

    setDeletingId(app._id);
    setError("");
    const res = await fetch(`/api/admin/applications/${app._id}`, { method: "DELETE" });
    setDeletingId(null);

    if (res.ok) removeApplication(app._id);
    else setError("Could not delete that application.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">All Applications</h2>
          <p className="text-muted mt-0.5 text-sm">
            Every application tracked across the platform.
            {!canEdit && " Read-only for your role."}
          </p>
        </div>
        <p className="text-muted text-sm">
          {loading ? "Loading…" : `${applications.length} total · ${owners.length} user${owners.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {failed && (
        <p className="surface rounded-lg border p-4 text-sm text-red-600">
          Could not load applications. Please refresh and try again.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          className="surface w-full max-w-sm rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          placeholder="Search company, role, owner, status…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        <select
          className="surface rounded-md border px-3 py-2 text-sm"
          value={ownerFilter}
          onChange={(e) => onOwner(e.target.value)}
          aria-label="Filter by owner"
        >
          <option value="">All users</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{o.label} ({o.count})</option>
          ))}
        </select>

        {(search || ownerFilter) && (
          <button
            type="button"
            onClick={() => { onSearch(""); onOwner(""); }}
            className="text-muted text-sm hover:underline"
          >
            Clear
          </button>
        )}

        <p className="text-muted ml-auto text-sm">
          {loading
            ? "Loading…"
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <ApplicationTable
        applications={deletingId ? pageItems.filter((a) => a._id !== deletingId) : pageItems}
        startIndex={(safePage - 1) * PAGE_SIZE}
        showOwner
        duplicateIds={duplicateIds}
        onView={(app) => setViewTarget(app as AdminApplication)}
        onEdit={canEdit ? (app) => setEditTarget(app as AdminApplication) : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onQuickUpdate={canEdit ? handleQuickUpdate : undefined}
      />

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

      <ApplicationFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(app) => {
          updateApplication({ ...(app as AdminApplication), owner: editTarget?.owner ?? null });
          setEditTarget(null);
        }}
        application={editTarget ?? undefined}
        endpoint={editTarget ? `/api/admin/applications/${editTarget._id}` : undefined}
        method="PATCH"
      />

      <ViewApplicationModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        application={viewTarget}
      />
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <PermissionGate action="view:applications">
      <Suspense fallback={<p className="text-muted text-sm">Loading…</p>}>
        <ApplicationsContent />
      </Suspense>
    </PermissionGate>
  );
}

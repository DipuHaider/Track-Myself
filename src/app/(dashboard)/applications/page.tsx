"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ApplicationTable, { type QuickField } from "@/components/applications/ApplicationTable";
import ApplicationFormModal from "@/components/applications/ApplicationFormModal";
import ViewApplicationModal from "@/components/applications/ViewApplicationModal";
import RecentlyDeletedModal from "@/components/applications/RecentlyDeletedModal";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/dashboard/PermissionGate";
import Loading, { InlineSpinner } from "@/components/shared/Spinner";
import Pagination, { PAGE_SIZE, usePagination } from "@/components/shared/Pagination";
import { useAllApplications, type AdminApplication } from "@/hooks/useAllApplications";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api/client";
import { computeDuplicateGroups } from "@/lib/applicationFlags";
import type { Application } from "@/types/application";


function ApplicationsContent() {
  const initialQuery = useSearchParams().get("q") ?? "";
  const {
    applications, loading, failed,
    updateApplication, patchApplication, removeApplication, addApplication,
  } = useAllApplications();

  /* List rows omit the job description and status history; the modals want
     the whole record, so it is fetched on open and the row is the fallback. */
  const openFull = async (row: AdminApplication, set: (app: AdminApplication) => void) => {
    try {
      const full = await apiFetch<AdminApplication>(`/api/admin/applications/${row._id}`);
      set({ ...row, ...full, owner: full.owner ?? row.owner });
    } catch {
      set(row);
    }
  };
  const [trashOpen, setTrashOpen] = useState(false);
  const { can } = usePermissions();

  const canEdit = can("edit:applications");
  const canDelete = can("delete:applications");

  const [editTarget, setEditTarget] = useState<AdminApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminApplication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(initialQuery);
  const [ownerFilter, setOwnerFilter] = useState("");

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
        app.companyName, app.jobTitle, app.platform, app.jobType, app.location, app.city, app.country,
        app.applicationStatus, app.notes, app.salary, app.contactNumber, ...(app.submissionMethods ?? [app.submissionMethod]),
        ...(app.contacts ?? []).flatMap((c) => [c.name, c.email]),
        app.owner?.name, app.owner?.email,
      ]
        .filter(Boolean)
        .some((f) => f!.toLowerCase().includes(q));
    });
  }, [applications, search, ownerFilter]);

  const duplicateKinds = useMemo(() => computeDuplicateGroups(filtered), [filtered]);
  const duplicateIds = useMemo(() => new Set(duplicateKinds.keys()), [duplicateKinds]);

  const { page: safePage, setPage: goToPage, totalPages, pageItems, startIndex } =
    usePagination(filtered, PAGE_SIZE);

  const onSearch = (v: string) => { setSearch(v); goToPage(1); };
  const onOwner = (v: string) => { setOwnerFilter(v); goToPage(1); };

  async function handleQuickUpdate(id: string, field: QuickField, value: string | boolean) {
    setError("");
    const previous = applications.find((a) => a._id === id);
    patchApplication(id, { [field]: value } as Partial<Application>);

    try {
      await apiFetch(`/api/admin/applications/${id}`, { method: "PATCH", json: { [field]: value } });
    } catch (err) {
      if (previous) patchApplication(id, { [field]: previous[field] } as Partial<Application>);
      setError(err instanceof Error ? err.message : "Could not update that application.");
    }
  }

  async function undoDelete(app: Application) {
    try {
      const restored = await apiFetch<AdminApplication>(`/api/admin/applications/trash/${app._id}`, { method: "POST" });
      addApplication({ ...restored, owner: restored.owner ?? (app as AdminApplication).owner ?? null });
      toast.success(`"${app.jobTitle}" restored`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore that application.");
    }
  }

  async function handleDelete(app: Application) {
    const owner = (app as AdminApplication).owner;

    setDeletingId(app._id);
    setError("");
    try {
      await apiFetch(`/api/admin/applications/${app._id}`, { method: "DELETE" });
    } catch (err) {
      setDeletingId(null);
      toast.error(err instanceof Error ? err.message : "Could not delete that application.");
      return;
    }
    setDeletingId(null);
    removeApplication(app._id);
    toast(`"${app.jobTitle}" moved to Recently deleted`, {
      description: `${app.companyName}${owner ? ` · ${owner.name}` : ""} · restorable for 30 days`,
      duration: 8000,
      action: { label: "Undo", onClick: () => { void undoDelete(app); } },
    });
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
        <div className="flex items-center gap-3">
          <p className="text-muted text-sm">
            {loading ? <InlineSpinner /> : `${applications.length} total · ${owners.length} user${owners.length === 1 ? "" : "s"}`}
          </p>
          {canDelete && (
          <button
          type="button"
          onClick={() => setTrashOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
        >
          <Trash2 size={14} /> Recently deleted
        </button>
          )}
        </div>
      </div>

      {failed && (
        <p role="alert" className="alert alert-danger">
          Could not load applications. Please refresh and try again.
        </p>
      )}
      {error && <p role="alert" className="alert alert-danger">{error}</p>}

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
            ? <InlineSpinner />
            : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <ApplicationTable
        applications={deletingId ? pageItems.filter((a) => a._id !== deletingId) : pageItems}
        startIndex={startIndex}
        showOwner
        duplicateIds={duplicateIds}
        duplicateKinds={duplicateKinds}
        onView={(app) => void openFull(app as AdminApplication, setViewTarget)}
        onEdit={canEdit ? (app) => void openFull(app as AdminApplication, setEditTarget) : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onQuickUpdate={canEdit ? handleQuickUpdate : undefined}
      />

      {!loading && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onChange={goToPage}
          total={filtered.length}
          shown={pageItems.length}
          noun="applications"
        />
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

      {canDelete && trashOpen && (
        <RecentlyDeletedModal<AdminApplication>
          open
          onClose={() => setTrashOpen(false)}
          endpoint="/api/admin/applications/trash"
          showOwner
          onRestored={(app) => { addApplication(app); toast.success(`"${app.jobTitle}" restored`); }}
        />
      )}

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
      <Suspense fallback={<Loading />}>
        <ApplicationsContent />
      </Suspense>
    </PermissionGate>
  );
}

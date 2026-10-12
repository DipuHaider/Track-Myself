"use client";

import { useState } from "react";
import type { Application } from "@/types/application";
import { parseJobTypes } from "@/constants/applicationStatus";
import { formatLocation } from "@/lib/applicationLocation";
import { formatSalary } from "@/lib/salary";
import type { DuplicateKind } from "@/lib/applicationFlags";
import AppDocButton from "@/components/applications/AppDocButton";
import ApplicationCard, {
  PrioritySelect, QuickActions, RowBadges, StatusSelect, docInfoFor, formatApplied,
  type OwnerInfo, type QuickField, type RowHandlers,
} from "@/components/applications/ApplicationCard";
import ApplicationsEmptyState, { type EmptyStateMode } from "@/components/applications/ApplicationsEmptyState";
import TableSkeleton from "@/components/applications/TableSkeleton";
import { useSession } from "next-auth/react";
import { canUseAppDocs } from "@/lib/permissions";

export type { QuickField } from "@/components/applications/ApplicationCard";

export default function ApplicationTable({
  applications,
  startIndex = 0,
  onView,
  onEdit,
  onDelete,
  onQuickUpdate,
  duplicateIds,
  duplicateKinds,
  showOwner = false,
  loading = false,
  emptyState,
  onAdd,
  onClearFilters,
}: {
  applications: Application[];
  startIndex?: number;
  showOwner?: boolean;
  onView?: (app: Application) => void;
  onEdit?: (app: Application) => void;
  onDelete?: (app: Application) => void;
  onQuickUpdate?: (id: string, field: QuickField, value: string | boolean) => Promise<void>;
  duplicateIds?: Set<string>;
  duplicateKinds?: Map<string, DuplicateKind>;
  loading?: boolean;
  emptyState?: EmptyStateMode;
  onAdd?: () => void;
  onClearFilters?: () => void;
}) {
  const { data: session } = useSession();
  const viewer = session?.user as { role?: string; plan?: string } | undefined;
  /* Per-application documents are Premium; free accounts do not get the column at all. */
  const showDocs = !showOwner && canUseAppDocs(viewer?.role, viewer?.plan);

  const [saving, setSaving] = useState<{ id: string; field: QuickField } | null>(null);

  const handleChange = async (app: Application, field: QuickField, value: string | boolean) => {
    if (!onQuickUpdate) return;
    setSaving({ id: app._id, field });
    try {
      await onQuickUpdate(app._id, field, value);
    } finally {
      setSaving(null);
    }
  };

  const handlersFor = (app: Application): RowHandlers => ({
    isSaving: (field) => saving?.id === app._id && saving?.field === field,
    onChange: onQuickUpdate ? (field, value) => void handleChange(app, field, value) : undefined,
    onView: onView ? () => onView(app) : undefined,
    onEdit: onEdit ? () => onEdit(app) : undefined,
    onDelete: onDelete ? () => onDelete(app) : undefined,
  });

  const kindOf = (app: Application): DuplicateKind | null =>
    duplicateKinds?.get(app._id) ?? (duplicateIds?.has(app._id) ? "same-role" : null);

  if (loading) return <TableSkeleton rows={5} />;

  if (applications.length === 0 && emptyState) {
    return <ApplicationsEmptyState mode={emptyState} onAdd={onAdd} onClear={onClearFilters} />;
  }

  const columns = 11 + (showOwner ? 1 : 0) + (showDocs ? 1 : 0);

  return (
    <>
      <div className="glass hidden overflow-hidden rounded-lg md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="surface-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium text-center text-muted">#</th>
                {showOwner && <th scope="col" className="px-4 py-3 font-medium">Owner</th>}
                <th scope="col" className="px-4 py-3 font-medium">Company</th>
                <th scope="col" className="px-4 py-3 font-medium">Job Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Job Type</th>
                <th scope="col" className="px-4 py-3 font-medium">Location</th>
                <th scope="col" className="px-4 py-3 font-medium">Salary</th>
                <th scope="col" className="px-4 py-3 font-medium">Applied</th>
                <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                <th scope="col" className="px-4 py-3 font-medium">Priority</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                {showDocs && <th scope="col" className="px-4 py-3 font-medium text-center">Docs</th>}
                <th scope="col" className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => {
                const handlers = handlersFor(app);
                const owner = (app as Application & { owner?: OwnerInfo }).owner;
                const types = parseJobTypes(app.jobType, app.workplaceType);
                return (
                  <tr key={app._id} className="border-t transition hover:bg-[var(--surface-2)]">
                    <td className="px-3 py-3 text-center text-xs text-muted tabular-nums">{startIndex + idx + 1}</td>

                    {showOwner && (
                      <td className="px-4 py-3">
                        {owner ? (
                          <>
                            <p className="font-medium">{owner.name}</p>
                            <p className="text-muted text-xs">{owner.email}</p>
                          </>
                        ) : (
                          <span className="text-muted text-xs">Deleted user</span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3 font-medium">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {app.companyName}
                        <RowBadges app={app} duplicateKind={kindOf(app)} />
                      </span>
                    </td>
                    <td className="px-4 py-3">{app.jobTitle}</td>
                    <td className="px-4 py-3">
                      {types.length ? (
                        <span className="flex flex-wrap gap-1">
                          {types.map((t) => (
                            <span key={t} className="role-badge job-type whitespace-nowrap">{t}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-muted px-4 py-3">{formatLocation(app) || "—"}</td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">{formatSalary(app)}</td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">{formatApplied(app.appliedDate)}</td>
                    <td className="text-muted px-4 py-3">
                      {[app.contacts?.[0]?.name, app.contacts?.[0]?.phone || app.contactNumber].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3"><PrioritySelect app={app} handlers={handlers} /></td>
                    <td className="px-4 py-3"><StatusSelect app={app} handlers={handlers} /></td>
                    {showDocs && (
                      <td className="px-4 py-3 text-center">
                        <AppDocButton applicationId={app._id} info={docInfoFor(app)} />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <QuickActions app={app} handlers={handlers} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {applications.length === 0 && (
                <tr>
                  <td className="text-muted px-4 py-10 text-center" colSpan={columns}>
                    No applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden" aria-label="Applications">
        {applications.map((app, idx) => (
          <ApplicationCard
            key={app._id}
            app={app}
            index={startIndex + idx + 1}
            duplicateKind={kindOf(app)}
            owner={showOwner ? (app as Application & { owner?: OwnerInfo }).owner ?? null : undefined}
            showDocs={showDocs}
            handlers={handlersFor(app)}
          />
        ))}
        {applications.length === 0 && (
          <li className="surface text-muted rounded-lg border px-4 py-10 text-center text-sm">No applications found.</li>
        )}
      </ul>
    </>
  );
}

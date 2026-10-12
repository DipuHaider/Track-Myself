"use client";

import { AlertTriangle, ChevronDown, Eye, Ghost, Pencil, Star, Trash2 } from "lucide-react";
import type { Application } from "@/types/application";
import { APPLICATION_STATUSES, parseJobTypes } from "@/constants/applicationStatus";
import { formatLocation } from "@/lib/applicationLocation";
import { formatSalary } from "@/lib/salary";
import { isPossibleGhost, postingAge, type DuplicateKind } from "@/lib/applicationFlags";
import { STATUS_CLASS } from "@/components/applications/StatusBadge";
import AppDocButton from "@/components/applications/AppDocButton";

export type QuickField = "priority" | "applicationStatus" | "favourite" | "isGhostJob";

export const PRIORITY_CLASS: Record<string, string> = {
  High: "priority-high",
  Medium: "priority-medium",
  Low: "priority-low",
};

export type OwnerInfo = { name?: string; email?: string; role?: string } | null;

export type RowHandlers = {
  isSaving: (field: QuickField) => boolean;
  onChange?: (field: QuickField, value: string | boolean) => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function formatApplied(d?: Date | string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function docInfoFor(app: Application) {
  return {
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    location: formatLocation(app) || undefined,
    notes: app.notes ?? undefined,
    jobPostUrl: app.jobPostUrl ?? undefined,
    platform: app.platform ?? undefined,
    jobDescription: app.jobDescription ?? undefined,
    contactName: app.contacts?.find(
      (c) => c.name && ["Recruiter", "Hiring Manager", "HR"].includes(c.role ?? ""),
    )?.name,
  };
}

export function RowBadges({ app, duplicateKind }: { app: Application; duplicateKind?: DuplicateKind | null }) {
  const age = postingAge(app);
  return (
    <>
      {duplicateKind && (
        <span
          className="role-badge badge-dup px-1.5 py-0.5 text-[10px]"
          title={
            duplicateKind === "same-posting"
              ? "Another row points at this exact job posting"
              : "Another row has the same company and job title — check before removing either"
          }
        >
          {duplicateKind === "same-posting" ? "Same post" : "Dup"}
        </span>
      )}
      {age.known && age.tone === "caution" && (
        <span className="role-badge status-no-resp px-1.5 py-0.5 text-[10px]" title={age.label}>
          Old listing
        </span>
      )}
    </>
  );
}

export function PrioritySelect({ app, handlers }: { app: Application; handlers: RowHandlers }) {
  const saving = handlers.isSaving("priority");
  if (!handlers.onChange) {
    return app.priority ? (
      <span className={`role-badge ${PRIORITY_CLASS[app.priority] ?? "status-wishlist"}`}>{app.priority}</span>
    ) : (
      <span className="text-muted">—</span>
    );
  }
  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label={`Priority for ${app.companyName}`}
        value={app.priority ?? ""}
        disabled={saving}
        onChange={(e) => handlers.onChange?.("priority", e.target.value)}
        className={`role-badge cursor-pointer appearance-none pr-5 transition-opacity ${
          app.priority ? (PRIORITY_CLASS[app.priority] ?? "status-wishlist") : "status-wishlist opacity-50"
        } ${saving ? "opacity-40" : ""}`}
      >
        <option value="">— None —</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
      <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50" aria-hidden="true" />
    </div>
  );
}

export function StatusSelect({ app, handlers }: { app: Application; handlers: RowHandlers }) {
  const saving = handlers.isSaving("applicationStatus");
  const cls = STATUS_CLASS[app.applicationStatus] ?? "status-wishlist";
  if (!handlers.onChange) {
    return <span className={`role-badge ${cls} whitespace-nowrap`}>{app.applicationStatus}</span>;
  }
  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label={`Status for ${app.companyName}`}
        value={app.applicationStatus}
        disabled={saving}
        onChange={(e) => handlers.onChange?.("applicationStatus", e.target.value)}
        className={`role-badge cursor-pointer appearance-none whitespace-nowrap pr-5 transition-opacity ${cls} ${saving ? "opacity-40" : ""}`}
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50" aria-hidden="true" />
    </div>
  );
}

const ICON_BTN = "rounded-md p-1.5 transition hover:bg-[var(--surface-2)] disabled:opacity-40";

export function QuickActions({ app, handlers }: { app: Application; handlers: RowHandlers }) {
  const { onChange, onView, onEdit, onDelete, isSaving } = handlers;
  return (
    <div className="flex items-center gap-1">
      {onChange && isPossibleGhost(app) && !app.isGhostJob && (
        <button
          type="button"
          title="Possible ghost job (45+ days, no progress) — click to confirm"
          aria-label="Mark as ghost job"
          onClick={() => onChange("isGhostJob", true)}
          disabled={isSaving("isGhostJob")}
          className={`${ICON_BTN} text-warning`}
        >
          <AlertTriangle size={15} aria-hidden="true" />
        </button>
      )}
      {onChange && app.isGhostJob && (
        <button
          type="button"
          title="Confirmed ghost job — click to unmark"
          aria-label="Unmark ghost job"
          onClick={() => onChange("isGhostJob", false)}
          disabled={isSaving("isGhostJob")}
          className={`${ICON_BTN} text-danger`}
        >
          <Ghost size={15} aria-hidden="true" />
        </button>
      )}
      {onChange && (
        <button
          type="button"
          onClick={() => onChange("favourite", !app.favourite)}
          disabled={isSaving("favourite")}
          title={app.favourite ? "Remove from favourites" : "Add to favourites"}
          aria-label={app.favourite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={!!app.favourite}
          className={`${ICON_BTN} ${app.favourite ? "text-warning" : "text-muted"}`}
        >
          <Star size={15} fill={app.favourite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}
      {onView && (
        <button type="button" onClick={onView} title="View" aria-label={`View ${app.companyName}`} className={`${ICON_BTN} text-muted hover:text-primary`}>
          <Eye size={15} aria-hidden="true" />
        </button>
      )}
      {onEdit && (
        <button type="button" onClick={onEdit} title="Edit" aria-label={`Edit ${app.companyName}`} className={`${ICON_BTN} text-muted hover:text-primary`}>
          <Pencil size={15} aria-hidden="true" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label={`Delete ${app.companyName}`}
          className={`${ICON_BTN} text-muted hover:text-[var(--danger)]`}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function ApplicationCard({
  app,
  index,
  duplicateKind,
  owner,
  showDocs,
  handlers,
}: {
  app: Application;
  index: number;
  duplicateKind?: DuplicateKind | null;
  owner?: OwnerInfo;
  showDocs?: boolean;
  handlers: RowHandlers;
}) {
  const types = parseJobTypes(app.jobType, app.workplaceType);
  const location = formatLocation(app);
  const salary = formatSalary(app);
  const contact = [app.contacts?.[0]?.name, app.contacts?.[0]?.phone || app.contactNumber].filter(Boolean).join(" · ");

  return (
    <li className="surface rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className="text-muted text-xs tabular-nums">#{index}</span>
            <span className="truncate">{app.companyName}</span>
            <RowBadges app={app} duplicateKind={duplicateKind} />
          </p>
          <p className="text-sm">{app.jobTitle}</p>
          {owner !== undefined && (
            <p className="text-muted text-xs">{owner ? `${owner.name ?? ""} · ${owner.email ?? ""}` : "Deleted user"}</p>
          )}
        </div>
        {showDocs && <AppDocButton applicationId={app._id} info={docInfoFor(app)} />}
      </div>

      {types.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {types.map((t) => (
            <span key={t} className="role-badge job-type whitespace-nowrap">{t}</span>
          ))}
        </div>
      )}

      <dl className="text-muted mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div><dt className="sr-only">Location</dt><dd>{location || "—"}</dd></div>
        <div><dt className="sr-only">Applied</dt><dd>{formatApplied(app.appliedDate)}</dd></div>
        <div><dt className="sr-only">Salary</dt><dd>{salary}</dd></div>
        <div><dt className="sr-only">Contact</dt><dd>{contact || "—"}</dd></div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect app={app} handlers={handlers} />
          <PrioritySelect app={app} handlers={handlers} />
        </div>
        <QuickActions app={app} handlers={handlers} />
      </div>
    </li>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Eye, Ghost, Pencil, Star, Trash2 } from "lucide-react";
import type { Application } from "@/types/application";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";
import { isPossibleGhost } from "@/lib/applicationFlags";

const CURRENCY_SYM: Record<string, string> = { EUR: "€", USD: "$", BDT: "৳" };

function formatSalary(app: Application): string {
  const sym = CURRENCY_SYM[app.salaryCurrency ?? ""] ?? "";
  if (app.salaryType === "range" && app.salaryMin != null && app.salaryMax != null) {
    return `${sym}${app.salaryMin.toLocaleString("en-US")} – ${sym}${app.salaryMax.toLocaleString("en-US")}`;
  }
  if (app.salaryFixed != null) {
    return `${sym}${app.salaryFixed.toLocaleString("en-US")}`;
  }
  if (app.salary) return app.salary;
  return "—";
}

function formatDateTime(d?: Date | string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PRIORITY_CLS: Record<string, string> = {
  High: "priority-high",
  Medium: "priority-medium",
  Low: "priority-low",
};

const STATUS_CLS: Record<string, string> = {
  "Wishlist":              "status-wishlist",
  "Submitted":             "status-submitted",
  "No Response":           "status-no-resp",
  "Interview Scheduled":   "status-interview",
  "Active - Written":      "status-active",
  "Active - HR":           "status-active",
  "Active - Technical":    "status-active",
  "Active - Cultural Fit": "status-active",
  "Offer Received":        "status-offer",
  "Rejected":              "status-rejected",
};

export type QuickField = "priority" | "applicationStatus" | "favourite" | "isGhostJob";

export default function ApplicationTable({
  applications,
  startIndex = 0,
  onView,
  onEdit,
  onDelete,
  onQuickUpdate,
  duplicateIds,
}: {
  applications: Application[];
  startIndex?: number;
  onView?: (app: Application) => void;
  onEdit?: (app: Application) => void;
  onDelete?: (app: Application) => void;
  onQuickUpdate?: (id: string, field: QuickField, value: string | boolean) => Promise<void>;
  duplicateIds?: Set<string>;
}) {
  const [saving, setSaving] = useState<{ id: string; field: QuickField } | null>(null);

  const handleChange = async (app: Application, field: QuickField, value: string | boolean) => {
    if (!onQuickUpdate) return;
    setSaving({ id: app._id, field });
    await onQuickUpdate(app._id, field, value);
    setSaving(null);
  };

  const isSaving = (id: string, field: QuickField) =>
    saving?.id === id && saving?.field === field;

  return (
    <div className="surface overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="surface-muted">
            <tr>
              <th className="px-3 py-3 font-medium text-center text-muted">#</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Job Title</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Salary</th>
              <th className="px-4 py-3 font-medium">Applied</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app, idx) => (
              <tr key={app._id} className="border-t transition hover:bg-[var(--surface-2)]">
                {/* # */}
                <td className="px-3 py-3 text-center text-xs text-muted tabular-nums">
                  {startIndex + idx + 1}
                </td>

                <td className="px-4 py-3 font-medium">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {app.companyName}
                    {duplicateIds?.has(app._id) && (
                      <span className="role-badge badge-dup px-1.5 py-0.5 text-[10px]">Dup</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">{app.jobTitle}</td>
                <td className="text-muted px-4 py-3">{app.location ?? app.country ?? "—"}</td>
                <td className="text-muted px-4 py-3 whitespace-nowrap">{formatSalary(app)}</td>
                <td className="text-muted px-4 py-3 whitespace-nowrap">{formatDateTime(app.appliedDate)}</td>
                <td className="text-muted px-4 py-3">{app.contactNumber ?? "—"}</td>

                {/* Priority */}
                <td className="px-4 py-3">
                  {onQuickUpdate ? (
                    <div className="relative inline-flex items-center">
                      <select
                        value={app.priority ?? ""}
                        disabled={isSaving(app._id, "priority")}
                        onChange={(e) => handleChange(app, "priority", e.target.value)}
                        className={`role-badge cursor-pointer appearance-none pr-5 transition-opacity ${
                          app.priority
                            ? (PRIORITY_CLS[app.priority] ?? "status-wishlist")
                            : "status-wishlist opacity-50"
                        } ${isSaving(app._id, "priority") ? "opacity-40" : ""}`}
                      >
                        <option value="">— None —</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                      <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50" />
                    </div>
                  ) : app.priority ? (
                    <span className={`role-badge ${PRIORITY_CLS[app.priority] ?? "status-wishlist"}`}>
                      {app.priority}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {onQuickUpdate ? (
                    <div className="relative inline-flex items-center">
                      <select
                        value={app.applicationStatus}
                        disabled={isSaving(app._id, "applicationStatus")}
                        onChange={(e) => handleChange(app, "applicationStatus", e.target.value)}
                        className={`role-badge cursor-pointer appearance-none whitespace-nowrap pr-5 transition-opacity ${
                          STATUS_CLS[app.applicationStatus] ?? "status-wishlist"
                        } ${isSaving(app._id, "applicationStatus") ? "opacity-40" : ""}`}
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50" />
                    </div>
                  ) : (
                    <span className={`role-badge ${STATUS_CLS[app.applicationStatus] ?? "status-wishlist"} whitespace-nowrap`}>
                      {app.applicationStatus}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {/* Auto-detected ghost — amber warning, click to confirm */}
                    {onQuickUpdate && isPossibleGhost(app) && !app.isGhostJob && (
                      <button
                        type="button"
                        title="Possible ghost job (45+ days, no progress) — click to confirm"
                        onClick={() => handleChange(app, "isGhostJob", true)}
                        disabled={isSaving(app._id, "isGhostJob")}
                        className="rounded-md p-1.5 text-amber-500 transition hover:bg-[var(--surface-2)] disabled:opacity-40"
                      >
                        <AlertTriangle size={15} />
                      </button>
                    )}
                    {/* Manually confirmed ghost — rose, click to unmark */}
                    {onQuickUpdate && app.isGhostJob && (
                      <button
                        type="button"
                        title="Confirmed ghost job — click to unmark"
                        onClick={() => handleChange(app, "isGhostJob", false)}
                        disabled={isSaving(app._id, "isGhostJob")}
                        className="rounded-md p-1.5 text-rose-700 transition hover:bg-[var(--surface-2)] disabled:opacity-40"
                      >
                        <Ghost size={15} />
                      </button>
                    )}
                    {/* Favourite star */}
                    {onQuickUpdate && (
                      <button
                        type="button"
                        onClick={() => handleChange(app, "favourite", !app.favourite)}
                        disabled={isSaving(app._id, "favourite")}
                        title={app.favourite ? "Remove from favourites" : "Add to favourites"}
                        className={`rounded-md p-1.5 transition hover:bg-[var(--surface-2)] disabled:opacity-40 ${
                          app.favourite ? "text-amber-400" : "text-muted"
                        }`}
                      >
                        <Star size={15} fill={app.favourite ? "currentColor" : "none"} />
                      </button>
                    )}
                    {onView && (
                      <button
                        type="button"
                        onClick={() => onView(app)}
                        title="View"
                        className="rounded-md p-1.5 text-muted transition hover:bg-[var(--surface-2)] hover:text-primary"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(app)}
                        title="Edit"
                        className="rounded-md p-1.5 text-muted transition hover:bg-[var(--surface-2)] hover:text-primary"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(app)}
                        title="Delete"
                        className="rounded-md p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td className="text-muted px-4 py-10 text-center" colSpan={10}>
                  No applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Trash2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS, type IssueStatus } from "@/constants/issues";

type Report = {
  _id: string;
  category: string;
  message: string;
  status: IssueStatus;
  email: string;
  role: string;
  url: string;
  viewport: string;
  note?: string;
  notifiedAt?: string | null;
  notifyError?: string;
  createdAt: string;
  userId?: { name?: string; email?: string } | string | null;
};

const STATUS_STYLE: Record<IssueStatus, string> = {
  open: "status-submitted",
  triaged: "status-interview",
  closed: "status-offer",
};

function reporter(report: Report) {
  if (report.userId && typeof report.userId === "object") {
    return report.userId.name || report.userId.email || report.email || "Unknown";
  }
  return report.email || "Unknown";
}

export default function IssueReportsPanel() {
  const { can } = usePermissions();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<IssueStatus | "all">("open");
  const [loading, setLoading] = useState(true);

  const manage = can("manage:issues");

  useEffect(() => {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    fetch(`/api/admin/issues${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setReports(Array.isArray(data?.reports) ? data.reports : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const setStatus = async (report: Report, status: IssueStatus) => {
    const before = reports;
    setReports((list) => list.map((r) => (r._id === report._id ? { ...r, status } : r)));
    const res = await fetch(`/api/admin/issues/${report._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (!res || !res.ok) setReports(before);
  };

  const remove = async (report: Report) => {
    const before = reports;
    setReports((list) => list.filter((r) => r._id !== report._id));
    const res = await fetch(`/api/admin/issues/${report._id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) setReports(before);
  };

  return (
    <section className="surface rounded-xl border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <LifeBuoy size={17} className="text-[var(--primary)]" aria-hidden="true" />
          Issue reports
        </h2>

        <div className="flex gap-1.5">
          {(["open", "triaged", "closed", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { setLoading(true); setFilter(key); }}
              aria-pressed={filter === key}
              className={`rounded-md border px-2.5 py-1 text-xs capitalize transition ${
                filter === key ? "border-[var(--primary)] text-[var(--primary)]" : "surface-muted"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-muted text-sm">Loading…</p>}
      {!loading && !reports.length && <p className="text-muted text-sm">Nothing reported here.</p>}

      <ul className="space-y-2">
        {reports.map((report) => (
          <li key={report._id} className="surface-muted rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{report.category}</span>
                <span className={`role-badge ${STATUS_STYLE[report.status]}`}>
                  {ISSUE_STATUS_LABELS[report.status]}
                </span>
              </div>
              <span className="text-muted text-xs">
                {reporter(report)} · {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="mt-2 text-sm whitespace-pre-wrap">{report.message}</p>

            <p className="text-muted mt-2 font-mono text-[11px]">
              {report.url || "—"} {report.viewport && `· ${report.viewport}`} {report.role && `· ${report.role}`}
            </p>

            <p className="mt-1 text-[11px]">
              {report.notifiedAt ? (
                <span className="text-emerald-600">Emailed {new Date(report.notifiedAt).toLocaleString()}</span>
              ) : (
                <span className="text-amber-600">
                  Not emailed{report.notifyError ? ` — ${report.notifyError}` : ""}
                </span>
              )}
            </p>

            {manage && (
              <div className="mt-3 flex items-center gap-1.5 border-t pt-2">
                {ISSUE_STATUSES.filter((s) => s !== report.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(report, s)}
                    className="surface rounded-md border px-2 py-1 text-xs transition hover:border-[var(--primary)]"
                  >
                    Mark {ISSUE_STATUS_LABELS[s].toLowerCase()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => remove(report)}
                  aria-label="Delete report"
                  className="text-muted ml-auto rounded p-1 transition hover:text-red-500"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

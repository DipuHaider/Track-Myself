"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, LifeBuoy, MailCheck, MailX, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { invalidateAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { invalidateAdminUsers } from "@/hooks/useAdminUsers";
import { apiFetch } from "@/lib/api/client";
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS, type IssueCounts, type IssueStatus } from "@/constants/issues";
import { announceIssueChange, onIssueChange } from "@/lib/issueSync";
import { useConfirm } from "@/components/shared/ConfirmDialog";

type Reporter = { _id?: string; name?: string; email?: string };

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
  userId?: Reporter | string | null;
};

type IssueList = { reports: Report[]; counts?: IssueCounts };

const POLL_MS = 30000;
const UPGRADE_CATEGORY = "Upgrade request";

const EMPTY_COUNTS: IssueCounts = { open: 0, triaged: 0, closed: 0, all: 0 };

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

function reporterId(report: Report): string | null {
  if (!report.userId) return null;
  if (typeof report.userId === "string") return report.userId;
  return report.userId._id ? String(report.userId._id) : null;
}

function errMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function IssueReportsPanel() {
  const { can } = usePermissions();
  const ask = useConfirm();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<IssueStatus | "all">("open");
  const [counts, setCounts] = useState<IssueCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const manage = can("manage:issues");
  const canEditUsers = can("edit:users");

  const load = useCallback(() => {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    apiFetch<IssueList>(`/api/admin/issues${qs}`)
      .then((data) => {
        setReports(Array.isArray(data?.reports) ? data.reports : []);
        if (data?.counts) setCounts(data.counts);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
    return onIssueChange(load);
  }, [load]);

  /* A channel only carries this browser's own tabs. Reports arrive from other
     people, so the queue also polls while it is the visible tab. */
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const setStatus = async (report: Report, status: IssueStatus) => {
    const before = reports;
    setReports((list) => list.map((r) => (r._id === report._id ? { ...r, status } : r)));
    try {
      await apiFetch(`/api/admin/issues/${report._id}`, { method: "PATCH", json: { status } });
      toast.success(`Report marked ${ISSUE_STATUS_LABELS[status].toLowerCase()}`);
      announceIssueChange();
    } catch (err) {
      setReports(before);
      toast.error(errMessage(err, "Could not update that report."));
    }
  };

  const resend = async (report: Report) => {
    setBusy(`${report._id}:resend`);
    try {
      const body = await apiFetch<{ ok?: boolean; report?: Partial<Report>; error?: string }>(`/api/admin/issues/${report._id}/resend`, { method: "POST" });
      if (body?.report) {
        setReports((list) => list.map((r) => (r._id === report._id ? { ...r, ...body.report } : r)));
        announceIssueChange();
      }
      if (body?.ok) toast.success("Email sent");
      else toast.error(body?.error || body?.report?.notifyError || "The email could not be delivered.");
    } catch (err) {
      toast.error(errMessage(err, "The email could not be delivered."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (report: Report) => {
    const ok = await ask({
      title: "Delete this report?",
      message: `The ${report.category.toLowerCase()} report from ${reporter(report)} is removed for good. Close it instead if you want to keep a record.`,
      confirmLabel: "Delete report",
      tone: "danger",
    });
    if (!ok) return;
    const before = reports;
    setReports((list) => list.filter((r) => r._id !== report._id));
    try {
      await apiFetch(`/api/admin/issues/${report._id}`, { method: "DELETE" });
      toast.success("Report deleted");
      announceIssueChange();
    } catch (err) {
      setReports(before);
      toast.error(errMessage(err, "Could not delete that report."));
    }
  };

  const setPremium = async (report: Report) => {
    const userId = reporterId(report);
    if (!userId) {
      toast.error("This report is not linked to an account.");
      return;
    }
    const ok = await ask({
      title: `Upgrade ${reporter(report)} to Premium?`,
      message: "Unlocks PDF export and AI CV tailoring for their account within five minutes, and closes this request.",
      confirmLabel: "Set Premium",
    });
    if (!ok) return;
    setBusy(`${report._id}:premium`);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "PATCH", json: { plan: "premium" } });
      toast.success(`${reporter(report)} is now Premium`);
      void invalidateAdminUsers();
      void invalidateAdminAnalytics();
    } catch (err) {
      toast.error(errMessage(err, "Could not upgrade that account."));
      setBusy(null);
      return;
    }
    try {
      await apiFetch(`/api/admin/issues/${report._id}`, { method: "PATCH", json: { status: "closed" } });
      setReports((list) => list.map((r) => (r._id === report._id ? { ...r, status: "closed" } : r)));
      announceIssueChange();
    } catch (err) {
      toast.error(errMessage(err, "Upgraded, but the request could not be closed."));
    } finally {
      setBusy(null);
    }
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
              <span className="ml-1.5 tabular-nums opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-muted text-sm">Loading…</p>}
      {!loading && failed && <p role="alert" className="alert alert-danger">Could not load issue reports.</p>}
      {!loading && !failed && !reports.length && <p className="text-muted text-sm">Nothing reported here.</p>}

      <ul className="space-y-2">
        {reports.map((report) => {
          const upgrade = report.category === UPGRADE_CATEGORY;
          return (
            <li key={report._id} className="surface-muted rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{report.category}</span>
                  {upgrade && (
                    <span className="role-badge plan-premium inline-flex items-center gap-1">
                      <Crown size={11} aria-hidden="true" /> Premium
                    </span>
                  )}
                  <span className={`role-badge ${STATUS_STYLE[report.status]}`}>
                    {ISSUE_STATUS_LABELS[report.status]}
                  </span>
                  {report.notifiedAt ? (
                    <span
                      className="role-badge badge-mail-sent"
                      title={`Emailed ${new Date(report.notifiedAt).toLocaleString()}`}
                    >
                      <MailCheck size={11} aria-hidden="true" />
                      Mail Sent
                    </span>
                  ) : (
                    <span
                      className="role-badge badge-mail-failed"
                      title={report.notifyError || "No delivery recorded"}
                    >
                      <MailX size={11} aria-hidden="true" />
                      Not sent
                    </span>
                  )}
                </div>
                <span className="text-muted text-xs">
                  {reporter(report)} · {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="mt-2 text-sm whitespace-pre-wrap">{report.message}</p>

              <p className="text-muted mt-2 font-mono text-[11px]">
                {report.url || "—"} {report.viewport && `· ${report.viewport}`} {report.role && `· ${report.role}`}
              </p>

              {!report.notifiedAt && report.notifyError && (
                <p className="text-warning mt-1 text-[11px]">{report.notifyError}</p>
              )}

              {manage && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2">
                  {upgrade && canEditUsers && report.status !== "closed" && (
                    <button
                      type="button"
                      onClick={() => setPremium(report)}
                      disabled={busy === `${report._id}:premium`}
                      className="btn-primary flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      <Crown size={11} aria-hidden="true" />
                      {busy === `${report._id}:premium` ? "Upgrading…" : "Set Premium"}
                    </button>
                  )}
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
                  {!report.notifiedAt && (
                    <button
                      type="button"
                      onClick={() => resend(report)}
                      disabled={busy === `${report._id}:resend`}
                      className="surface flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:border-[var(--primary)] disabled:opacity-50"
                    >
                      <RefreshCw size={11} aria-hidden="true" />
                      {busy === `${report._id}:resend` ? "Sending…" : "Resend email"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(report)}
                    aria-label="Delete report"
                    className="text-muted ml-auto rounded p-1 transition hover:text-[var(--danger)]"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

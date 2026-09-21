"use client";

import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { ISSUE_STATUS_LABELS, type IssueStatus } from "@/constants/issues";

type Report = {
  _id: string;
  category: string;
  message: string;
  status: IssueStatus;
  note?: string;
  createdAt: string;
};

const STATUS_STYLE: Record<IssueStatus, string> = {
  open: "status-submitted",
  triaged: "status-interview",
  closed: "status-offer",
};

export default function MyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/issues")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setReports(Array.isArray(rows) ? rows : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !reports.length) return null;

  return (
    <section id="my-reports" className="surface scroll-mt-24 rounded-xl border p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <LifeBuoy size={17} className="text-[var(--primary)]" aria-hidden="true" />
        Reported issues
      </h2>

      <ul className="space-y-2">
        {reports.slice(0, 5).map((report) => (
          <li key={report._id} className="surface-muted rounded-lg border px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium">{report.category}</span>
              <span className={`role-badge ${STATUS_STYLE[report.status]}`}>
                {ISSUE_STATUS_LABELS[report.status]}
              </span>
            </div>
            <p className="text-muted mt-1 line-clamp-2 text-sm">{report.message}</p>
            {report.note && (
              <p className="mt-1 text-xs text-[var(--primary)]">Reply: {report.note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

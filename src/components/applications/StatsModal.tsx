"use client";

import { useEffect } from "react";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import Link from "next/link";
import { X } from "lucide-react";
import type { Application } from "@/types/application";

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

const PRIORITY_CLS: Record<string, string> = {
  High: "priority-high",
  Medium: "priority-medium",
  Low: "priority-low",
};

function badgeCls(s: string) {
  return s.startsWith("Active") ? "status-active" : (STATUS_CLS[s] ?? "status-wishlist");
}

export default function StatsModal({
  title,
  applications,
  onClose,
}: {
  title: string;
  applications: Application[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = applications.slice(0, 10);

  const { page, setPage, totalPages, pageItems, startIndex, total } = usePagination(rows);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface w-full max-w-2xl rounded-xl border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-muted text-xs mt-0.5">
              {rows.length} of {applications.length} shown (most recent first)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition hover:bg-[var(--surface-2)] hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-muted px-5 py-10 text-center text-sm">
              No applications in this category yet.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="surface-muted">
                <tr>
                  <th className="px-4 py-3 font-medium text-center text-muted">#</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((app, i) => (
                  <tr key={app._id} className="border-t transition hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-2.5 text-center text-xs text-muted tabular-nums">{startIndex + i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{app.companyName}</td>
                    <td className="text-muted px-4 py-2.5">{app.jobTitle}</td>
                    <td className="px-4 py-2.5">
                      <span className={`role-badge ${badgeCls(app.applicationStatus)} whitespace-nowrap`}>
                        {app.applicationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {app.priority ? (
                        <span className={`role-badge ${PRIORITY_CLS[app.priority] ?? "priority-medium"}`}>
                          {app.priority}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-muted px-4 py-2.5 whitespace-nowrap">
                      {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t px-5 py-2.5">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              total={total}
              shown={pageItems.length}
              noun="applications"
              compact
            />
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-5 py-3 text-right">
          <Link
            href="/me/applications"
            className="text-xs hover:underline"
            style={{ color: "var(--primary)" }}
            onClick={onClose}
          >
            View all in Applications →
          </Link>
        </div>
      </div>
    </div>
  );
}

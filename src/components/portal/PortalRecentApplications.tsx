"use client";

import Link from "next/link";
import { Briefcase, Star } from "lucide-react";
import StatusBadge from "@/components/applications/StatusBadge";
import { PRIORITY_CLASS } from "@/components/applications/ApplicationCard";
import { useApplicationStats } from "@/hooks/useApplicationStats";

function formatDate(d?: Date | string) {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function PortalRecentApplications() {
  const { stats, loading, error, paused } = useApplicationStats();
  if (paused || error) return null;
  const recent = stats?.recent ?? [];

  return (
    <section data-tour="recent">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted text-sm font-semibold uppercase tracking-wide">Recent Applications</h2>
        <Link href="/me/applications" className="text-primary text-xs">Manage all →</Link>
      </div>

      {loading || !stats ? (
        <div className="surface h-40 animate-pulse rounded-xl border" role="status" aria-live="polite" aria-busy="true">
          <span className="sr-only">Loading recent applications</span>
        </div>
      ) : recent.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center gap-3 rounded-xl border py-12 text-center">
          <span className="icon-chip status-submitted"><Briefcase size={16} aria-hidden="true" /></span>
          <p className="font-medium">No applications yet</p>
          <Link href="/me/applications" className="btn-primary rounded-md px-4 py-2 text-sm">
            + Add your first application
          </Link>
        </div>
      ) : (
        <div className="surface overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Company</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-3 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => (
                  <tr key={app._id} className="border-t transition hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/me/applications?open=${app._id}`} className="inline-flex items-center gap-1.5 hover:underline">
                        {app.favourite && <Star size={12} className="text-warning" fill="currentColor" aria-label="Favourite" />}
                        {app.companyName}
                      </Link>
                    </td>
                    <td className="text-muted px-4 py-3">{app.jobTitle}</td>
                    <td className="px-4 py-3"><StatusBadge status={app.applicationStatus} /></td>
                    <td className="px-4 py-3">
                      {app.priority ? (
                        <span className={`role-badge ${PRIORITY_CLASS[app.priority] ?? "status-wishlist"}`}>{app.priority}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-muted px-4 py-3 whitespace-nowrap">{formatDate(app.appliedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

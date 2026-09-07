"use client";

import Link from "next/link";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import StatusBadge from "@/components/applications/StatusBadge";
import ChartFrame from "./ChartFrame";

export default function RecentApplications() {
  const { data, loading, failed } = useAdminAnalytics();
  const rows = data?.recent ?? [];

  return (
    <ChartFrame
      title="Recent Applications"
      caption="Latest activity across all users"
      loading={loading}
      failed={failed}
      empty={rows.length === 0}
      emptyLabel="No applications yet."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="surface-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id} className="border-t">
                <td className="px-4 py-2.5 font-medium">{a.companyName}</td>
                <td className="text-muted px-4 py-2.5">{a.jobTitle}</td>
                <td className="px-4 py-2.5"><StatusBadge status={a.applicationStatus} /></td>
                <td className="text-muted whitespace-nowrap px-4 py-2.5">
                  {a.date ? new Date(a.date).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href="/applications"
          className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
        >
          All applications →
        </Link>
      </div>
    </ChartFrame>
  );
}

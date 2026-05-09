import type { Application } from "@/types/application";
import StatusBadge from "@/components/applications/StatusBadge";

export default function ApplicationTable({
  applications,
}: {
  applications: Application[];
}) {
  return (
    <div className="surface overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="surface-muted">
          <tr>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app._id} className="border-t">
              <td className="px-4 py-3">{app.companyName}</td>
              <td className="px-4 py-3">{app.jobTitle}</td>
              <td className="px-4 py-3">
                <StatusBadge status={app.applicationStatus} />
              </td>
            </tr>
          ))}
          {applications.length === 0 ? (
            <tr>
              <td className="text-muted px-4 py-8" colSpan={3}>
                No applications yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

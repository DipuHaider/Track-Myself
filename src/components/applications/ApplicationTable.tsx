import { Eye, Pencil, Trash2 } from "lucide-react";
import StatusBadge from "@/components/applications/StatusBadge";
import type { Application } from "@/types/application";

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

export default function ApplicationTable({
  applications,
  onView,
  onEdit,
  onDelete,
}: {
  applications: Application[];
  onView?: (app: Application) => void;
  onEdit?: (app: Application) => void;
  onDelete?: (app: Application) => void;
}) {
  return (
    <div className="surface overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="surface-muted">
            <tr>
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
            {applications.map((app) => (
              <tr key={app._id} className="border-t transition hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3 font-medium">{app.companyName}</td>
                <td className="px-4 py-3">{app.jobTitle}</td>
                <td className="text-muted px-4 py-3">{app.location ?? app.country ?? "—"}</td>
                <td className="text-muted px-4 py-3">{app.salary ?? "—"}</td>
                <td className="text-muted px-4 py-3 whitespace-nowrap">{formatDateTime(app.appliedDate)}</td>
                <td className="text-muted px-4 py-3">{app.contactNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {app.priority ? (
                    <span className={`role-badge ${PRIORITY_CLS[app.priority] ?? "status-wishlist"}`}>
                      {app.priority}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.applicationStatus} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
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
                <td className="text-muted px-4 py-10 text-center" colSpan={9}>
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

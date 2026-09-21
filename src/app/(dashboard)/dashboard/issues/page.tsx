import IssueReportsPanel from "@/components/dashboard/IssueReportsPanel";
import PermissionGate from "@/components/dashboard/PermissionGate";

export default function DashboardIssuesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Issue Reports</h2>
        <p className="text-muted mt-1 text-sm">
          Everything users have reported, with the page address, viewport and browser attached.
          Triage each one to triaged or closed as you work through them.
        </p>
      </div>

      <PermissionGate action="view:issues">
        <IssueReportsPanel />
      </PermissionGate>
    </div>
  );
}

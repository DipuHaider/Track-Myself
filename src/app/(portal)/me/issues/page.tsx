import MyReports from "@/components/portal/MyReports";
import ReportIssueButton from "@/components/portal/ReportIssueButton";

export default function IssuesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Issue reports</h1>
          <p className="text-muted mt-1 text-sm">
            Anything you have reported, and where it got to. The page address and your browser are
            attached automatically so we can reproduce it.
          </p>
        </div>

        <ReportIssueButton />
      </div>

      <MyReports showEmpty />
    </div>
  );
}

import MyReports from "@/components/portal/MyReports";
import ReportIssueButton from "@/components/portal/ReportIssueButton";

export default function IssuesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Reported Issues</h1>
          <p className="text-muted mt-1 text-sm">
            Everything you have reported and where each one got to. The page address and your
            browser are attached automatically so we can reproduce it.
          </p>
        </div>

        <ReportIssueButton />
      </div>

      <MyReports showEmpty />
    </div>
  );
}

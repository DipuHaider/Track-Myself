import { Suspense } from "react";
import Link from "next/link";
import { FileBarChart, ListFilter, Settings } from "lucide-react";
import JobInbox from "@/components/jobs/JobInbox";
import Loading from "@/components/shared/Spinner";

export default function JobsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Job inbox</h1>
          <p className="text-muted mt-1 text-sm">
            Fresh jobs from your saved searches. Pick the ones worth it, prepare them, review, then apply with the extension.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/me/jobs/report" className="btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm">
            <FileBarChart size={14} aria-hidden="true" /> Report
          </Link>
          <Link href="/me/jobs/searches" className="btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm">
            <ListFilter size={14} aria-hidden="true" /> Saved searches
          </Link>
          <Link href="/me/settings?tab=job-hunt" className="btn-secondary inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm">
            <Settings size={14} aria-hidden="true" /> Targets
          </Link>
        </div>
      </div>
      <Suspense fallback={<Loading padded={false} className="py-10" />}>
        <JobInbox />
      </Suspense>
    </div>
  );
}

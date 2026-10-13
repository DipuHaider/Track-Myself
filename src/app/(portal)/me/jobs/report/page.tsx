import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReportView from "@/components/jobs/ReportView";

export const metadata = { title: "Daily report" };

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/me/jobs" className="text-muted inline-flex items-center gap-1 text-sm hover:underline">
        <ArrowLeft size={14} aria-hidden="true" /> Job inbox
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Daily report</h1>
        <p className="text-muted mt-1 text-sm">What came in, what is waiting for you, what closes soon, and what your own numbers suggest.</p>
      </div>
      <ReportView />
    </div>
  );
}

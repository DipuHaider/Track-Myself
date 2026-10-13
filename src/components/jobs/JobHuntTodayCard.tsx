"use client";

import Link from "next/link";
import { ChevronRight, Radar } from "lucide-react";
import { useJobHuntSettings, useLeadSummary } from "@/hooks/useJobHunt";
import TargetProgress from "@/components/jobs/TargetProgress";

export default function JobHuntTodayCard() {
  const { allowed, settings } = useJobHuntSettings();
  const { summary } = useLeadSummary(allowed);
  if (!allowed || !summary) return null;

  return (
    <section className="surface rounded-xl border p-5" aria-labelledby="job-hunt-today">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="job-hunt-today" className="flex items-center gap-2 font-semibold">
          <Radar size={16} className="text-primary" aria-hidden="true" /> Job hunt today
        </h2>
        <Link href="/me/jobs" className="text-primary inline-flex items-center gap-1 text-sm hover:underline">
          Open inbox <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <p className="text-muted mb-3 text-sm">
        {summary.totals.fresh} new · {summary.totals.ready} ready for review · {summary.totals.submittedToday} of {summary.totals.target} applied
        {settings && !settings.enabled && " · the daily search is off"}
      </p>
      <TargetProgress summary={summary} compact />
    </section>
  );
}

"use client";

import { TARGET_PLATFORMS, type TargetPlatform } from "@/lib/jobs/settings";
import type { LeadSummary } from "@/lib/jobs/leads";

export const TARGET_LABELS: Record<TargetPlatform, string> = {
  linkedin: "LinkedIn",
  xing: "XING",
  stepstone: "StepStone",
  other: "Other sites",
};

export default function TargetProgress({ summary, compact = false }: { summary: LeadSummary; compact?: boolean }) {
  const rows = TARGET_PLATFORMS.filter((p) => summary.platforms[p].target > 0 || summary.platforms[p].submitted > 0);
  if (!rows.length) {
    return <p className="text-muted text-sm">No daily targets set. Add them in Settings, Job hunt.</p>;
  }
  return (
    <ul className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>
      {rows.map((p) => {
        const s = summary.platforms[p];
        const pct = s.target ? Math.min(100, Math.round((s.submitted / s.target) * 100)) : 100;
        const done = s.target > 0 && s.submitted >= s.target;
        return (
          <li key={p} className={compact ? "" : "surface rounded-lg border p-3"}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{TARGET_LABELS[p]}</span>
              <span className="text-muted tabular-nums">
                {s.submitted} / {s.target} applied{s.ready ? ` · ${s.ready} ready` : ""}
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${TARGET_LABELS[p]} applications today`}
              aria-valuemin={0}
              aria-valuemax={s.target}
              aria-valuenow={s.submitted}
            >
              <div className="progress-fill" data-done={done} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

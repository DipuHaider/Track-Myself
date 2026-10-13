import { Hourglass } from "lucide-react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/jobs/constants";

const DAY = 86_400_000;

export function FitChip({ score, mode }: { score: number | null; mode?: string }) {
  if (score == null) return <span className="fit-chip fit-low" title="No CV to compare against yet">Fit —</span>;
  const tone = score >= 65 ? "fit-high" : score >= 40 ? "fit-mid" : "fit-low";
  const how = mode === "ai" ? "AI gap check" : "word overlap between your CV and the posting";
  return (
    <span className={`fit-chip ${tone}`} title={`Fit ${score}/100, from ${how}. Not a judgement of ability.`}>
      Fit {score}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`lead-status lead-status-${status}`}>{LEAD_STATUS_LABELS[status]}</span>;
}

export function daysUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  const startToday = new Date(new Date(now).toDateString()).getTime();
  const endDay = new Date(end.toDateString()).getTime();
  return Math.round((endDay - startToday) / DAY);
}

export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  if (days == null) return null;
  const label = days < 0 ? "Closed" : days === 0 ? "Closes today" : days === 1 ? "Closes tomorrow" : `Closes in ${days} days`;
  const tone = days < 0 ? "text-muted" : days <= 3 ? "text-warning" : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone}`} title={new Date(deadline!).toLocaleDateString("en-GB")}>
      <Hourglass size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

export function postedLabel(postedAt: string | null, text?: string): string {
  if (!postedAt) return text || "Posting date unknown";
  const days = Math.max(0, Math.floor((Date.now() - new Date(postedAt).getTime()) / DAY));
  return days === 0 ? "Posted today" : days === 1 ? "Posted yesterday" : `Posted ${days} days ago`;
}

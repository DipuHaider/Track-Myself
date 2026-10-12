/* Client-safe mirror of the reason ids in src/lib/ai/triage.ts. That file
   pulls the AI gateway in, so the browser bundle must never import it. */
export const TRIAGE_REASON_IDS = [
  "follow-up-due",
  "interview-soon",
  "silent-since-applied",
  "wishlist-stale",
  "never-applied",
] as const;

export type TriageReasonId = (typeof TRIAGE_REASON_IDS)[number];

export type TriageReasonLabel = { label: string; badge: string };

export const TRIAGE_REASONS: Record<TriageReasonId, TriageReasonLabel> = {
  "follow-up-due": { label: "Follow-up due", badge: "status-no-resp" },
  "interview-soon": { label: "Interview soon", badge: "status-interview" },
  "silent-since-applied": { label: "No reply yet", badge: "status-submitted" },
  "wishlist-stale": { label: "Saved a while ago", badge: "status-wishlist" },
  "never-applied": { label: "Not applied yet", badge: "status-not-completed" },
};

const FALLBACK: TriageReasonLabel = { label: "", badge: "status-wishlist" };

function humanise(id: string): string {
  const text = id.replace(/[-_]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Needs attention";
}

export function triageReason(id: string): TriageReasonLabel {
  const known = (TRIAGE_REASONS as Record<string, TriageReasonLabel | undefined>)[id];
  return known ?? { ...FALLBACK, label: humanise(id) };
}

export function triageReasonLabel(id: string): string {
  return triageReason(id).label;
}

export function triageReasonBadge(id: string): string {
  return triageReason(id).badge;
}

export type TriageRowView = {
  id: string;
  company: string;
  jobTitle: string;
  status: string;
  reasons: string[];
  observed: string[];
  daysSinceApplied: number | null;
  suggestion: string;
};

export type TriageResultView = {
  mode: "ai" | "rules";
  rows: TriageRowView[];
  note: string;
};

export function attentionSummary(count: number): string {
  if (count === 0) return "Nothing needs attention right now.";
  return `${count} application${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} attention`;
}

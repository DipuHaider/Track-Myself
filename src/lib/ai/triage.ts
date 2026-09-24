import { runAiTask, type Actor } from "@/lib/ai/gateway";
import type { AICredential } from "@/lib/cv/ai/provider";
import { postingAge } from "@/lib/applicationFlags";
import type { Application } from "@/types/application";

export const SHORTLIST_MAX = 15;

export type TriageReason =
  | "follow-up-due"
  | "interview-soon"
  | "silent-since-applied"
  | "wishlist-stale"
  | "never-applied";

export type TriageRow = {
  id: string;
  company: string;
  jobTitle: string;
  status: string;
  reasons: TriageReason[];
  observed: string[];
  daysSinceApplied: number | null;
  suggestion: string;
};

/* Nothing here reads a status string literally — they come from the record, and
   the two terminal outcomes are named by comparison against what the row
   actually holds. */
const TERMINAL = new Set(["Offer Received", "Rejected"]);

const SILENT_DAYS = 14;
const WISHLIST_STALE_DAYS = 21;

function daysSince(value: unknown): number | null {
  if (!value) return null;
  const at = new Date(value as string).getTime();
  if (Number.isNaN(at)) return null;
  return Math.floor((Date.now() - at) / 86_400_000);
}

export type InterviewLite = { applicationId: string; scheduledDate?: string | Date | null; status?: string };

/* Deterministic shortlist. This is the part that must be right: a model ranking
   the wrong fifteen rows produces confident nonsense, and the user cannot tell
   because the reasoning reads fine either way. */
export function shortlist(apps: Application[], interviews: InterviewLite[]): TriageRow[] {
  const upcoming = new Map<string, number>();
  for (const iv of interviews) {
    if (iv.status && iv.status !== "Scheduled") continue;
    const days = daysSince(iv.scheduledDate);
    if (days === null || days > 0) continue;
    upcoming.set(String(iv.applicationId), Math.abs(days));
  }

  const rows: TriageRow[] = [];

  for (const app of apps) {
    if (TERMINAL.has(app.applicationStatus)) continue;

    const reasons: TriageReason[] = [];
    const observed: string[] = [];
    const applied = daysSince(app.appliedDate);

    const followUp = daysSince(app.followUpDate);
    if (app.followUpDate && followUp !== null && followUp >= 0) {
      reasons.push("follow-up-due");
      observed.push(followUp === 0 ? "follow-up due today" : `follow-up was due ${followUp} days ago`);
    }

    const inDays = upcoming.get(app._id);
    if (inDays !== undefined && inDays <= 7) {
      reasons.push("interview-soon");
      observed.push(inDays === 0 ? "interview today" : `interview in ${inDays} days`);
    }

    if (app.applicationStatus === "Wishlist") {
      const age = daysSince(app.createdAt);
      if (age !== null && age >= WISHLIST_STALE_DAYS) {
        reasons.push("never-applied");
        observed.push(`saved ${age} days ago, never applied`);
      }
    } else if (applied !== null && applied >= SILENT_DAYS && !upcoming.has(app._id)) {
      reasons.push("silent-since-applied");
      observed.push(`applied ${applied} days ago, status still "${app.applicationStatus}"`);
    }

    const age = postingAge(app);
    if (age.known && age.tone === "caution") observed.push(age.label.toLowerCase());

    if (!reasons.length) continue;

    rows.push({
      id: app._id,
      company: app.companyName ?? "",
      jobTitle: app.jobTitle ?? "",
      status: app.applicationStatus,
      reasons,
      observed,
      daysSinceApplied: applied,
      suggestion: "",
    });
  }

  const weight = (r: TriageRow) =>
    (r.reasons.includes("interview-soon") ? 1000 : 0) +
    (r.reasons.includes("follow-up-due") ? 500 : 0) +
    (r.daysSinceApplied ?? 0);

  return rows.sort((a, b) => weight(b) - weight(a)).slice(0, SHORTLIST_MAX);
}

function buildPrompt(rows: TriageRow[]): string {
  const lines = rows.map((r, i) =>
    `${i + 1}. ${r.company} — ${r.jobTitle} [${r.status}] :: ${r.observed.join("; ")}`,
  );

  return `These are job applications that may need attention. For each, write one short, concrete next step.

RULES
- One sentence per item, under 20 words, addressed to the applicant.
- Base it only on what is observed below. Do not infer an employer's intent or state.
- An application with no recorded activity does not mean the employer has not replied by email or phone.
- Never suggest contacting anyone on the applicant's behalf, and never claim anything was sent.
- If an interview is upcoming, preparation beats chasing.
- Do not invent dates, names or outcomes.

ITEMS
${lines.join("\n")}

Return ONLY a JSON array of ${rows.length} strings, in the same order.`;
}

export type TriageResult = { mode: "ai" | "rules"; rows: TriageRow[]; note: string };

const RULE_SUGGESTION: Record<TriageReason, string> = {
  "interview-soon": "Interview coming up — prepare with the question generator.",
  "follow-up-due": "Your follow-up date has passed. Decide whether to chase it.",
  "silent-since-applied": "No change since you applied. Consider a polite follow-up.",
  "wishlist-stale": "Saved a while ago and still not applied.",
  "never-applied": "Saved a while ago and still not applied. Apply or drop it.",
};

export function ruleSuggestions(rows: TriageRow[]): TriageResult {
  return {
    mode: "rules",
    note: "Based on your saved dates and statuses only.",
    rows: rows.map((r) => ({ ...r, suggestion: RULE_SUGGESTION[r.reasons[0]] ?? "" })),
  };
}

export async function triageWithAi(opts: {
  rows: TriageRow[];
  actor: Actor;
  userKey?: AICredential | null;
}): Promise<TriageResult> {
  if (!opts.rows.length) return { mode: "rules", rows: [], note: "Nothing needs attention right now." };

  const run = await runAiTask({
    task: "cv.gap-analysis",
    actor: opts.actor,
    prompt: buildPrompt(opts.rows),
    maxOutputTokens: 1200,
    userKey: opts.userKey,
  });

  if (!run.ok) {
    const fallback = ruleSuggestions(opts.rows);
    return { ...fallback, note: `${run.message} ${fallback.note}` };
  }

  const match = run.text.match(/\[[\s\S]*\]/);
  let parsed: unknown[] = [];
  try {
    parsed = match ? (JSON.parse(match[0]) as unknown[]) : [];
  } catch {
    parsed = [];
  }

  /* A reply of the wrong length means the model dropped or invented rows, and
     pairing suggestions with the wrong applications would be worse than having
     none. The deterministic set stands either way. */
  if (parsed.length !== opts.rows.length) return ruleSuggestions(opts.rows);

  return {
    mode: "ai",
    note: "Suggestions only — nothing has been sent, and no status has been changed.",
    rows: opts.rows.map((r, i) => ({
      ...r,
      suggestion: typeof parsed[i] === "string" ? String(parsed[i]).slice(0, 200) : "",
    })),
  };
}

import type { CVContent } from "@/types/cv";
import { runAiTask, type Actor } from "@/lib/ai/gateway";
import type { AICredential } from "@/lib/cv/ai/provider";

export type SalaryEstimate = { low: number; high: number; currency: string; note: string };

export type EstimateRole = {
  jobTitle: string;
  companyName?: string;
  location?: string;
  jobDescription?: string;
  currency: string;
};

export function yearsOfExperience(cv: CVContent, now = new Date()): number {
  const years = cv.experience.flatMap((e) => (e.dates.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number));
  if (!years.length) return 0;
  return Math.max(0, now.getFullYear() - Math.min(...years));
}

export function buildEstimatePrompt(role: EstimateRole, cv: CVContent): string {
  const latest = cv.experience.find((e) => e.title);
  return [
    "Estimate the typical gross annual base salary range for this job. Return only JSON:",
    '{"low": 48000, "high": 58000, "currency": "EUR", "note": "one short sentence on what drives the range"}',
    "",
    "Rules:",
    `- Use the currency ${role.currency}. Whole numbers, gross per year, base salary only (no bonus or equity).`,
    "- low is roughly the 25th percentile and high the 75th for this role, seniority and location.",
    "- If the location is unknown, assume the country implied by the currency.",
    "- Never refuse; give your best estimate and keep the note factual.",
    "",
    `Role: ${role.jobTitle}`,
    role.companyName ? `Company: ${role.companyName}` : "",
    role.location ? `Location: ${role.location}` : "",
    `Candidate: ${latest ? `currently ${latest.title}` : "seniority unknown"}, about ${yearsOfExperience(cv)} years of experience`,
    role.jobDescription ? `\nPosting:\n${role.jobDescription.slice(0, 6000)}` : "",
  ].filter((l) => l !== "").join("\n");
}

export function parseEstimate(text: string, currency: string): SalaryEstimate | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: { low?: unknown; high?: unknown; note?: unknown };
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const low = Number(raw.low);
  const high = Number(raw.high);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high <= 0) return null;
  if (low > high || high > low * 5) return null;
  return {
    low: Math.round(low),
    high: Math.round(high),
    currency,
    note: typeof raw.note === "string" ? raw.note.trim().slice(0, 300) : "",
  };
}

export async function estimateSalary(opts: {
  role: EstimateRole;
  cv: CVContent;
  actor: Actor;
  userKey?: AICredential | null;
}): Promise<{ ok: true; estimate: SalaryEstimate; providerLabel: string } | { ok: false; error: string }> {
  const run = await runAiTask({
    task: "salary.estimate",
    actor: opts.actor,
    prompt: buildEstimatePrompt(opts.role, opts.cv),
    maxOutputTokens: 400,
    userKey: opts.userKey,
  });
  if (!run.ok) return { ok: false, error: run.message };
  const estimate = parseEstimate(run.text, opts.role.currency);
  if (!estimate) return { ok: false, error: `${run.providerLabel} did not return a usable salary range.` };
  return { ok: true, estimate, providerLabel: run.providerLabel };
}

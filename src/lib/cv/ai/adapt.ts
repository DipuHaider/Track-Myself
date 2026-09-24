import {
  PROVIDER_LABELS, callProvider, resolveCredentials,
  type AICredential, type AIProvider, type FailureKind, type TokenUsage,
} from "./provider";
import type { CVContent, CVSkillGroup } from "@/types/cv";

export const JD_MAX = 24_000;
export const CORRECTION_MAX = 2_000;

export type TailorOutput = {
  positioning: string;
  summary: string;
  summaryShort: string;
  skills: CVSkillGroup[];
};

export type TailorResult =
  | { ok: true; value: TailorOutput; provider: AIProvider; providerLabel: string }
  | { ok: false; kind: "no-key" | "upstream" | "unparsable" | "error"; error: string };

/**
 * The feature promises reordering, not rewriting: "It never rewrites your roles or
 * bullet points." Nothing stops the model returning invented labels or dropping
 * skills, and the client saves the result immediately — so reconcile here. Only the
 * order can come from the model; the groups and their contents come from the user.
 */
export function reconcileSkills(
  original: CVSkillGroup[],
  proposed: { label: string; items: string }[],
): CVSkillGroup[] {
  const key = (s: string) => s.trim().toLowerCase();
  const byLabel = new Map(original.map((g) => [key(g.label), g]));
  const out: CVSkillGroup[] = [];
  const used = new Set<string>();

  for (const group of proposed) {
    const match = byLabel.get(key(group.label));
    if (!match || used.has(key(group.label))) continue;
    used.add(key(group.label));

    const originalItems = match.items.split(",").map((i) => i.trim()).filter(Boolean);
    const proposedItems = group.items.split(",").map((i) => i.trim()).filter(Boolean);

    const ordered = proposedItems.filter((i) =>
      originalItems.some((o) => o.toLowerCase() === i.toLowerCase()),
    );
    const dropped = originalItems.filter((o) =>
      !ordered.some((i) => i.toLowerCase() === o.toLowerCase()),
    );

    out.push({ ...match, items: [...ordered, ...dropped].join(", ") });
  }

  for (const group of original) {
    if (!used.has(key(group.label))) out.push(group);
  }

  return out;
}

export function buildTailorPrompt(
  content: CVContent,
  jobDescription: string,
  opts: { correction?: string; previousSummary?: string } = {},
): string {
  const experienceText = content.experience
    .map((job) => {
      const header = [job.title, job.company, job.dates].filter(Boolean).join(" · ");
      return [header, ...job.bullets.map((b) => `- ${b}`)].join("\n");
    })
    .join("\n\n");

  const skillsText = content.skills.map((g) => `${g.label}: ${g.items}`).join("\n");

  const revision = opts.correction?.trim()
    ? `
THE CANDIDATE REVIEWED YOUR PREVIOUS VERSION AND ASKED FOR THIS
${opts.correction.trim().slice(0, CORRECTION_MAX)}

${opts.previousSummary?.trim() ? `Your previous summary was:\n${opts.previousSummary.trim()}\n` : ""}
Revise that version to address the request. Keep everything they did not ask you to change.
`
    : "";

  return `You are an expert CV writer. Tailor the candidate's CV to the job description below.
Keep every fact accurate — reframe and reorder existing information only. Do not invent experience.

CANDIDATE CV
Name: ${content.name || "N/A"}
Positioning: ${content.positioning || "N/A"}
Summary: ${content.summary || "N/A"}

Experience:
${experienceText || "N/A"}

Skill groups:
${skillsText || "N/A"}

Education: ${content.education.map((e) => `${e.degree}, ${e.school} (${e.dates})`).join("; ") || "N/A"}
Languages: ${content.languages.map((l) => `${l.name} (${l.level})`).join(", ") || "N/A"}

JOB DESCRIPTION
${jobDescription.trim()}
${revision}
Return ONLY a valid JSON object with these keys, no markdown and no explanation:
{
  "positioning": "job-aligned professional title, 2-5 words",
  "summary": "tailored 3-5 sentence summary highlighting fit for this role",
  "summaryShort": "the same positioning compressed to two sentences",
  "skills": [{ "label": "existing group label", "items": "same skills, most relevant to this job first" }]
}
The "skills" array must contain exactly the same group labels as the input, reordered so the group most
relevant to this job comes first, and with the items inside each group reordered the same way.`;
}

function parseTailorJson(content: CVContent, text: string): TailorOutput | null {
  /* responseMimeType gets us clean JSON from Gemini, but Claude wraps prose around
     it often enough that the brace grab stays as the safety net. */
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: {
    positioning?: string;
    summary?: string;
    summaryShort?: string;
    skills?: { label?: string; items?: string }[];
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const proposed = Array.isArray(parsed.skills)
    ? parsed.skills
        .map((g) => ({ label: String(g?.label ?? ""), items: String(g?.items ?? "") }))
        .filter((g) => g.label || g.items)
    : [];

  return {
    positioning: typeof parsed.positioning === "string" ? parsed.positioning : "",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    summaryShort: typeof parsed.summaryShort === "string" ? parsed.summaryShort : "",
    skills: reconcileSkills(content.skills, proposed),
  };
}

/**
 * Walks the provider chain and returns the first success. Never throws — every
 * failure is a typed result so callers can degrade rather than 500.
 */
export async function runTailor(
  content: CVContent,
  jobDescription: string,
  opts: {
    correction?: string;
    previousSummary?: string;
    superadmin?: boolean;
    userKey?: AICredential | null;
    onUsage?: (usage: TokenUsage | undefined, outcome: { ok: boolean; kind?: FailureKind; error?: string }) => void;
  } = {},
): Promise<TailorResult> {
  const chain = resolveCredentials({ superadmin: Boolean(opts.superadmin), sharedAllowed: true, userKey: opts.userKey });
  if (!chain.length) return { ok: false, kind: "no-key", error: "AI service not configured." };

  const prompt = buildTailorPrompt(content, jobDescription, opts);
  const failures: string[] = [];

  for (const cred of chain) {
    const call = await callProvider(cred, prompt);
    if (cred.source === "user") opts.onUsage?.(call.usage, call);

    if (!call.ok) {
      console.error("CV tailor provider failed:", call.error);
      failures.push(call.error);
      continue;
    }

    const value = parseTailorJson(content, call.text);
    if (!value) {
      const why = `${PROVIDER_LABELS[cred.provider]} returned something that was not CV JSON.`;
      console.error("CV tailor parse failed:", why);
      failures.push(why);
      continue;
    }

    return { ok: true, value, provider: cred.provider, providerLabel: PROVIDER_LABELS[cred.provider] };
  }

  return {
    ok: false,
    kind: "upstream",
    error: failures[failures.length - 1] ?? "AI request failed.",
  };
}

/** Applies only the fields the model is allowed to touch, and reports which moved. */
export function applyTailorOutput(
  content: CVContent,
  out: TailorOutput,
): { content: CVContent; changedFields: string[] } {
  const changedFields: string[] = [];
  const next = { ...content };

  if (out.positioning && out.positioning !== content.positioning) {
    next.positioning = out.positioning;
    changedFields.push("positioning");
  }
  if (out.summary && out.summary !== content.summary) {
    next.summary = out.summary;
    changedFields.push("summary");
  }
  if (out.summaryShort && out.summaryShort !== content.summaryShort) {
    next.summaryShort = out.summaryShort;
    changedFields.push("summaryShort");
  }
  if (out.skills.length && out.skills.some((g, i) => g !== content.skills[i])) {
    next.skills = out.skills;
    changedFields.push("skills");
  }

  return { content: next, changedFields };
}

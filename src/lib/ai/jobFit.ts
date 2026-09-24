import { runAiTask, type Actor } from "@/lib/ai/gateway";
import type { AICredential } from "@/lib/cv/ai/provider";
import type { CVContent } from "@/types/cv";

export const JD_LIMIT = 12_000;

export type Verdict = "match" | "partial" | "not-evidenced" | "unclear";

export type GapItem = {
  requirement: string;
  excerpt: string;
  level: "required" | "preferred" | "unclear";
  verdict: Verdict;
  evidence: string[];
  suggestion: string;
  question: string;
};

export type GapAnalysis = {
  mode: "ai" | "keyword";
  items: GapItem[];
  note: string;
};

const VERDICTS: Verdict[] = ["match", "partial", "not-evidenced", "unclear"];
const LEVELS = ["required", "preferred", "unclear"] as const;

/* The CV is flattened to labelled sections so the model can cite where it found
   something. Without a section to point at, "evidence" is just an assertion. */
function cvSections(cv: CVContent): string {
  const parts: string[] = [];

  if (cv.summary) parts.push(`[summary] ${cv.summary}`);
  if (cv.positioning) parts.push(`[positioning] ${cv.positioning}`);

  for (const group of cv.skills ?? []) {
    if (group.items) parts.push(`[skills:${group.label || "general"}] ${group.items}`);
  }

  for (const role of cv.experience ?? []) {
    const bullets = (role.bullets ?? []).join(" ");
    parts.push(`[experience:${role.company || "role"}] ${role.title ?? ""} — ${bullets}`.trim());
  }

  for (const p of cv.projects ?? []) {
    parts.push(`[project:${p.name || "project"}] ${p.stack ?? ""} ${p.text ?? ""}`.trim());
  }

  for (const e of cv.education ?? []) {
    parts.push(`[education] ${e.degree ?? ""} ${e.school ?? ""} ${e.note ?? ""}`.trim());
  }

  if (cv.certifications?.length) parts.push(`[certifications] ${cv.certifications.join(", ")}`);

  return parts.join("\n").slice(0, 16_000);
}

/* The wording matters more than the schema here. A CV is a document, not a
   record of everything a person can do, so the only claim the evidence supports
   is about the document. Saying "the candidate lacks X" from a CV that merely
   does not mention X is the failure this prompt exists to prevent. */
function buildPrompt(cv: CVContent, jobDescription: string): string {
  return `Compare a CV against a job description and report, for each requirement in the posting, whether the CV evidences it.

RULES
- Quote the requirement from the job description verbatim in "excerpt". Do not paraphrase it.
- "verdict" is about THE DOCUMENT, never the person:
  - "match": the CV clearly evidences this.
  - "partial": related or transferable experience, not the exact thing asked for.
  - "not-evidenced": this CV does not mention it. This does NOT mean the candidate cannot do it.
  - "unclear": the requirement itself is too vague to judge.
- "evidence" lists the [section] labels that support the verdict, copied exactly. Empty when not evidenced.
- "level" is "required" if the posting demands it, "preferred" if it is nice-to-have, "unclear" otherwise.
- "suggestion" proposes wording the candidate could add ONLY if the CV already supports it. Otherwise leave it empty and put a question in "question" asking what they have done.
- Never invent experience, employers, dates or qualifications.
- Repetition in the posting does not establish importance.
- At most 12 items, most important first.

JOB DESCRIPTION
${jobDescription.slice(0, JD_LIMIT)}

CV SECTIONS
${cvSections(cv)}

Return ONLY a JSON array:
[{"requirement":"","excerpt":"","level":"required","verdict":"match","evidence":[],"suggestion":"","question":""}]`;
}

function parse(raw: string, cv: CVContent): GapItem[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  let rows: unknown[];
  try {
    rows = JSON.parse(match[0]) as unknown[];
  } catch {
    return [];
  }

  const known = new Set(cvSections(cv).split("\n").map((l) => l.match(/^\[([^\]]+)\]/)?.[1] ?? ""));

  return rows
    .map((r) => r as Record<string, unknown>)
    .filter((r) => typeof r.requirement === "string" && r.requirement.trim().length > 2)
    .slice(0, 12)
    .map((r) => {
      const verdict = VERDICTS.includes(r.verdict as Verdict) ? (r.verdict as Verdict) : "unclear";
      /* A cited section that does not exist is a fabricated citation, so it is
         dropped rather than shown; a verdict left with no evidence at all is
         downgraded rather than trusted. */
      const evidence = Array.isArray(r.evidence)
        ? (r.evidence as unknown[])
            .filter((e): e is string => typeof e === "string")
            .map((e) => e.replace(/^\[|\]$/g, ""))
            .filter((e) => known.has(e))
            .slice(0, 6)
        : [];

      return {
        requirement: String(r.requirement).trim().slice(0, 300),
        excerpt: String(r.excerpt ?? "").trim().slice(0, 400),
        level: (LEVELS as readonly string[]).includes(String(r.level)) ? (r.level as GapItem["level"]) : "unclear",
        verdict: (verdict === "match" || verdict === "partial") && evidence.length === 0 ? "unclear" : verdict,
        evidence,
        suggestion: String(r.suggestion ?? "").trim().slice(0, 400),
        question: String(r.question ?? "").trim().slice(0, 300),
      };
    });
}

/* Job postings are mostly connective tissue. Without a decent stop list the
   "missing skills" column fills up with words like "strong" and "experience",
   which is worse than useless — it buries the two terms that matter. */
const STOP = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "this", "that",
  "your", "from", "work", "team", "role", "into", "about", "who", "all", "not",
  "need", "needs", "strong", "plus", "experience", "experienced", "skills", "skill",
  "years", "year", "working", "ability", "able", "good", "great", "excellent",
  "must", "should", "would", "like", "including", "include", "such", "well",
  "using", "use", "used", "knowledge", "understanding", "familiar", "familiarity",
  "looking", "join", "help", "build", "building", "across", "within", "their",
  "them", "they", "what", "when", "where", "while", "been", "also", "more", "most",
  "very", "some", "any", "can", "our", "who", "how", "why", "etc",
  "you", "are", "its", "was", "has", "had", "but", "out", "off", "per", "via",
  "new", "own", "one", "two", "may", "get", "set", "see", "add", "run", "day",
  "days", "role", "roles", "based", "part", "full", "time", "week", "month",
  "bonus", "nice", "plus", "ideally", "preferably", "desirable", "advantage",
]);

/* Zero-inference mode, used when the allowance is spent or AI is off. It reports
   only which words of the posting appear in the CV, and says so — it is not a
   judgement about requirements and must not be presented as one. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    /* + and # survive so "c++" and "c#" stay whole; a full stop does not, or
       a term at the end of a sentence never matches the same word in a CV. */
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean);
}

export function keywordGaps(cv: CVContent, jobDescription: string): GapAnalysis {
  /* Whole tokens, not substrings. "sql" appears inside "postgresql" and "go"
     inside "google", so a substring test reports skills the CV never claimed. */
  const haystack = new Set(tokens(cvSections(cv)));

  const terms = [...new Set(
    jobDescription
      .toLowerCase()
      /* + and # survive so "c++" and "c#" stay whole; a full stop does not, or
         a term at the end of a sentence never matches the same word in a CV. */
      .split(/[^a-z0-9+#]+/)
      /* Three characters, not four: aws, sql, git, c++ and c# are precisely the
         kind of gap worth surfacing, and a longer floor makes them invisible.
         The stop list carries the weight instead. */
      .filter((w) => (w.length >= 3 || /[+#]/.test(w)) && !STOP.has(w)),
  )];

  const missing = terms.filter((w) => !haystack.has(w)).slice(0, 12);

  return {
    mode: "keyword",
    note: "Word matching only — this compares wording, not meaning, and says nothing about whether you can do the work.",
    items: missing.map((w) => ({
      requirement: w,
      excerpt: "",
      level: "unclear" as const,
      verdict: "not-evidenced" as const,
      evidence: [],
      suggestion: "",
      question: `The posting uses "${w}" and your CV does not. Is that something you have done?`,
    })),
  };
}

export async function analyseJobFit(opts: {
  cv: CVContent;
  jobDescription: string;
  actor: Actor;
  userKey?: AICredential | null;
}): Promise<GapAnalysis> {
  const run = await runAiTask({
    task: "cv.gap-analysis",
    actor: opts.actor,
    prompt: buildPrompt(opts.cv, opts.jobDescription),
    maxOutputTokens: 3000,
    userKey: opts.userKey,
  });

  if (!run.ok) {
    const fallback = keywordGaps(opts.cv, opts.jobDescription);
    return { ...fallback, note: `${run.message} ${fallback.note}` };
  }

  const items = parse(run.text, opts.cv);
  if (!items.length) {
    const fallback = keywordGaps(opts.cv, opts.jobDescription);
    return { ...fallback, note: `${run.providerLabel} returned nothing usable. ${fallback.note}` };
  }

  return {
    mode: "ai",
    items,
    note: "“Not evidenced” means this CV does not show it — not that you cannot do it.",
  };
}

import type { CVContent } from "@/types/cv";
import type { AppInfo } from "@/lib/cv/docx/coverLetter";
import { postingTerms } from "@/lib/ai/jobFit";
import { runAiTask, type Actor } from "@/lib/ai/gateway";
import type { AICredential } from "@/lib/cv/ai/provider";

export type CoverLetterText = {
  greeting: string;
  paragraphs: string[];
  closing: string;
};

const MAX_PARAGRAPHS = 8;
const MAX_PARAGRAPH = 1500;
const MAX_LINE = 160;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function sanitizeLetter(input: unknown): CoverLetterText | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { greeting?: unknown; paragraphs?: unknown; closing?: unknown };
  const paragraphs = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.map((p) => clean(p, MAX_PARAGRAPH)).filter(Boolean).slice(0, MAX_PARAGRAPHS)
    : [];
  if (!paragraphs.length) return null;
  return {
    greeting: clean(raw.greeting, MAX_LINE) || "Dear Hiring Manager,",
    paragraphs,
    closing: clean(raw.closing, MAX_LINE) || "Kind regards,",
  };
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean));
}

function overlap(text: string, terms: Set<string>): number {
  let n = 0;
  for (const w of words(text)) if (terms.has(w)) n++;
  return n;
}

function sentence(text: string): string {
  const t = text.trim().replace(/[.;,\s]+$/, "");
  if (!t) return "";
  return `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function greetingFor(info: AppInfo): string {
  return info.contactName ? `Dear ${info.contactName},` : "Dear Hiring Manager,";
}

export function draftCoverLetter(c: CVContent, info: AppInfo): CoverLetterText {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n");
  const terms = new Set(postingTerms(posting));

  const skills = [...new Set(c.skills.flatMap((g) => g.items.split(",").map((s) => s.trim()).filter(Boolean)))];
  const matchedSkills = terms.size
    ? skills.filter((s) => [...words(s)].some((w) => terms.has(w))).slice(0, 5)
    : [];
  const shownSkills = matchedSkills.length ? matchedSkills : skills.slice(0, 4);

  const roles = c.experience.filter((e) => e.title || e.company);
  const ranked = terms.size
    ? [...roles].sort((a, b) => overlap(b.bullets.join(" "), terms) - overlap(a.bullets.join(" "), terms))
    : roles;
  const lead = ranked[0];
  const latest = roles[0];

  const bullets = lead
    ? [...lead.bullets]
        .filter(Boolean)
        .sort((a, b) => (terms.size ? overlap(b, terms) - overlap(a, terms) : 0))
        .slice(0, 2)
        .map(sentence)
        .filter(Boolean)
    : [];

  const who = c.positioning || latest?.title || c.gradeTitle || "";
  const where = info.location ? ` in ${info.location.split(",")[0].trim()}` : "";
  const paragraphs: string[] = [];

  paragraphs.push(
    `I am applying for the ${info.jobTitle} position at ${info.companyName}${where}. ` +
    (who
      ? `I am ${/^[aeiou]/i.test(who) ? "an" : "a"} ${who}${latest?.company ? `, currently with ${latest.company},` : ""} ` +
        `and this role is a close match for the work I do best.`
      : "This role is a close match for the work I do best."),
  );

  if (lead && bullets.length) {
    paragraphs.push(
      `In my role as ${lead.title}${lead.company ? ` at ${lead.company}` : ""}, I ${bullets[0]}` +
      (bullets[1] ? `. I also ${bullets[1]}.` : "."),
    );
  } else if (c.summary) {
    paragraphs.push(c.summary);
  }

  if (shownSkills.length) {
    paragraphs.push(
      matchedSkills.length
        ? `Your posting asks for ${list(shownSkills)}, which is where I work day to day, and I would bring that ` +
          `experience to ${info.companyName} from the first week.`
        : `My core skills are ${list(shownSkills)}, and I would bring them to ${info.companyName} from the first week.`,
    );
  }

  const availability = c.availability.trim().replace(/[.\s]+$/, "");
  paragraphs.push(
    `I would welcome a conversation about how I could contribute to your team. My CV is attached.` +
    (availability ? ` ${availability.charAt(0).toUpperCase()}${availability.slice(1)}.` : ""),
  );

  return { greeting: greetingFor(info), paragraphs, closing: "Kind regards," };
}

function cvForPrompt(c: CVContent): string {
  const lines = [
    `Name: ${c.name}`,
    c.positioning && `Positioning: ${c.positioning}`,
    c.summary && `Summary: ${c.summary}`,
    c.skills.length && `Skills: ${c.skills.map((g) => `${g.label}: ${g.items}`).join(" | ")}`,
    ...c.experience.slice(0, 5).map(
      (e) => `Role: ${e.title} at ${e.company} (${e.dates})\n${e.bullets.slice(0, 6).map((b) => `- ${b}`).join("\n")}`,
    ),
    c.education?.length && `Education: ${c.education.map((e) => [e.degree, e.school].filter(Boolean).join(", ")).join(" | ")}`,
    c.languages?.length && `Languages: ${c.languages.map((l) => [l.name, l.level].filter(Boolean).join(" ")).join(", ")}`,
    c.availability && `Availability: ${c.availability}`,
  ];
  return lines.filter(Boolean).join("\n").slice(0, 9000);
}

export function buildCoverLetterPrompt(c: CVContent, info: AppInfo, correction = ""): string {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n").slice(0, 9000);
  return [
    "Write a cover letter for this job application. Return only JSON:",
    '{"greeting": "...", "paragraphs": ["...", "..."], "closing": "..."}',
    "",
    "Rules:",
    "- 3 to 4 paragraphs, 220-350 words in total. No headings, no bullet points, no placeholders.",
    "- Use only facts from the CV below. Never invent employers, numbers, degrees or skills.",
    "- Tie two or three concrete CV achievements to what the posting actually asks for.",
    "- Name the company and the role. Open with why this role, not with \"I am writing to\".",
    "- Plain, confident, specific; no clichés such as \"passionate\", \"team player\" or \"I believe I would be a great fit\".",
    "- Write in the same language as the job posting.",
    `- Greeting: ${info.contactName ? `address ${info.contactName} by name` : "\"Dear Hiring Manager,\" (or the posting's language equivalent)"}.`,
    "- Closing: a short sign-off line such as \"Kind regards,\" without the name.",
    correction ? `- The candidate asked for these changes: ${correction.slice(0, 2000)}` : "",
    "",
    `Company: ${info.companyName}`,
    `Role: ${info.jobTitle}`,
    info.location ? `Location: ${info.location}` : "",
    "",
    "Job posting:",
    posting || "(no posting text — write from the role title and the CV)",
    "",
    "CV:",
    cvForPrompt(c),
  ].filter((l) => l !== "").join("\n");
}

export function parseCoverLetterJson(text: string): CoverLetterText | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return sanitizeLetter(JSON.parse(match[0]));
  } catch {
    return null;
  }
}

export async function writeCoverLetter(opts: {
  content: CVContent;
  info: AppInfo;
  actor: Actor;
  userKey?: AICredential | null;
  correction?: string;
  useAi: boolean;
}): Promise<{ letter: CoverLetterText; mode: "ai" | "heuristic"; note: string; providerLabel: string }> {
  const fallback = draftCoverLetter(opts.content, opts.info);
  if (!opts.useAi) {
    return {
      letter: fallback,
      mode: "heuristic",
      note: "Drafted from your CV and the posting's keywords. Edit any paragraph before accepting.",
      providerLabel: "",
    };
  }

  const run = await runAiTask({
    task: "cover-letter.write",
    actor: opts.actor,
    prompt: buildCoverLetterPrompt(opts.content, opts.info, opts.correction),
    maxOutputTokens: 1500,
    userKey: opts.userKey,
  });

  if (!run.ok) {
    return { letter: fallback, mode: "heuristic", note: `${run.message} Showing a keyword-based draft instead.`, providerLabel: "" };
  }

  const letter = parseCoverLetterJson(run.text);
  if (!letter) {
    return {
      letter: fallback,
      mode: "heuristic",
      note: `${run.providerLabel} returned something that was not a letter. Showing a keyword-based draft instead.`,
      providerLabel: run.providerLabel,
    };
  }

  return {
    letter,
    mode: "ai",
    note: `${run.providerLabel} wrote this letter for ${opts.info.companyName}. Edit any paragraph before accepting.`,
    providerLabel: run.providerLabel,
  };
}

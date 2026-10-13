import type { CVContent, CVProject } from "@/types/cv";
import type { AppInfo } from "@/lib/cv/docx/coverLetter";
import { postingTerms } from "@/lib/ai/jobFit";
import { runAiJsonTask, type Actor } from "@/lib/ai/gateway";
import { fence } from "@/lib/ai/prompt";
import { coverLetterSchema } from "@/lib/ai/schemas";
import type { AICredential } from "@/lib/cv/ai/provider";
import type { CoverLetterText } from "@/lib/cv/letterLayout";

export { PROJECTS_HEADING, letterBlocks, letterPlainText, type CoverLetterText, type LetterBlock } from "@/lib/cv/letterLayout";

const MAX_PARAGRAPHS = 8;
const MAX_PARAGRAPH = 1500;
const MAX_LINE = 160;
const MAX_PROJECTS = 5;
const MAX_PROJECT_LINE = 220;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function sanitizeLetter(input: unknown): CoverLetterText | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { greeting?: unknown; paragraphs?: unknown; projects?: unknown; closing?: unknown };
  const paragraphs = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.map((p) => clean(p, MAX_PARAGRAPH)).filter(Boolean).slice(0, MAX_PARAGRAPHS)
    : [];
  if (!paragraphs.length) return null;
  const projects = Array.isArray(raw.projects)
    ? raw.projects.map((p) => clean(p, MAX_PROJECT_LINE).replace(/^[-•*]\s*/, "")).filter(Boolean).slice(0, MAX_PROJECTS)
    : [];
  return {
    greeting: clean(raw.greeting, MAX_LINE) || "Dear Hiring Manager,",
    paragraphs,
    ...(projects.length ? { projects } : {}),
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

const LABEL_PREFIX =/^[A-Z][\w&/ -]{1,40}:\s+(?=\S)/;

export function sentence(text: string): string {
  const t = text.trim().replace(LABEL_PREFIX, "").replace(/[.;,\s]+$/, "");
  if (!t) return "";
  if (/^[A-Z]{2}/.test(t) || /^[A-Z][a-z]*[A-Z]/.test(t.split(/\s/)[0])) return t;
  return `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}

const ORG_RE = /\b(group|gmbh|ag|se|kg|ltd|limited|llc|inc|corp|corporation|plc|company|co\.|bank|university|universität|institute|agency|solutions|technologies|systems|holding|holdings)(?=\W|$)/i;
const PLACE_PREFIX = /^[^,()]{2,30},\s*[A-Z][\w-]+\s+(?=[A-Z])/;

/* Imported CVs sometimes put the employer in the title slot and "City, Country Title"
   in the company slot; the letter should still name the role and the employer correctly. */
export function roleParts(e: { title: string; company: string }): { title: string; company: string } {
  let title = e.title.trim();
  let company = e.company.trim();
  if (ORG_RE.test(title) && !ORG_RE.test(company)) [title, company] = [company, title];
  title = title.replace(PLACE_PREFIX, "").trim();
  company = company.replace(PLACE_PREFIX, "").trim();
  return { title, company };
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function greetingFor(info: AppInfo): string {
  return info.contactName ? `Dear ${info.contactName},` : "Dear Hiring Manager,";
}

export function projectLine(p: CVProject): string {
  const text = p.text.replace(/\s+/g, " ").trim();
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? "";
  const trimmed = firstSentence.replace(/[.;,\s]+$/, "");
  const detail = trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed;
  return [p.name.trim(), detail].filter(Boolean).join(" – ") + (p.stack.trim() ? ` (${p.stack.trim()})` : "");
}

export function pickProjects(c: CVContent, posting: string, max = 4): string[] {
  const terms = new Set(postingTerms(posting));
  const rows = (c.projects ?? []).filter((p) => p.name.trim());
  const ranked = terms.size
    ? rows
        .map((p, i) => ({ p, i, score: overlap(`${p.name} ${p.stack} ${p.text}`, terms) }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .map((r) => r.p)
    : rows;
  return ranked.slice(0, max).map(projectLine).map((l) => l.slice(0, MAX_PROJECT_LINE));
}

export function aOrAn(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export function yearsOfExperience(c: CVContent, now = new Date()): number {
  const years = c.experience.flatMap((e) => (e.dates.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number));
  if (!years.length) return 0;
  return Math.max(0, now.getFullYear() - Math.min(...years));
}

/* A long CV headline ("X – Cloud & Web Applications") repeated in every letter
   reads as boilerplate. Introduce the candidate with the core of the headline or
   whichever of their real job titles is closest to the role applied for. */
export function introTitle(c: CVContent, jobTitle: string): string {
  const core = c.positioning.split(/\s+[-–—|·]\s+|\s*\|\s*/)[0].trim();
  const target = words(jobTitle);
  const options = [core, ...c.experience.map((e) => roleParts(e).title)]
    .map((t) => t.trim())
    .filter((t) => t && t.length <= 60);
  let best = options[0] ?? c.gradeTitle;
  let bestScore = 0;
  for (const t of options) {
    const score = [...words(t)].filter((w) => target.has(w)).length;
    if (score > bestScore) { best = t; bestScore = score; }
  }
  return best ?? "";
}

export function introPhrase(c: CVContent, jobTitle: string): string {
  const title = introTitle(c, jobTitle);
  const years = yearsOfExperience(c);
  if (!title) return years ? `a developer with ${years} years of experience` : "";
  return `${aOrAn(title)} ${title}${years >= 2 ? ` with ${years} years of experience` : ""}`;
}

export function draftCoverLetter(c: CVContent, info: AppInfo): CoverLetterText {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n");
  const terms = new Set(postingTerms(posting));

  const skills = [...new Set(c.skills.flatMap((g) => g.items.split(",").map((s) => s.trim()).filter(Boolean)))];
  const matchedSkills = terms.size
    ? skills.filter((s) => [...words(s)].some((w) => terms.has(w))).slice(0, 5)
    : [];
  const shownSkills = matchedSkills.length ? matchedSkills : skills.slice(0, 4);

  const roles = c.experience
    .filter((e) => e.title || e.company)
    .map((e, i) => ({ ...e, ...roleParts(e), i }));
  const ranked = terms.size
    ? [...roles].sort((a, b) => overlap(b.bullets.join(" "), terms) - overlap(a.bullets.join(" "), terms) || a.i - b.i)
    : roles;
  const featured = ranked.slice(0, 2).sort((a, b) => a.i - b.i);
  const latest = roles[0];

  const who = introPhrase(c, info.jobTitle);
  const where = info.location ? ` in ${info.location.split(",")[0].trim()}` : "";
  const seen = info.platform ? `, advertised on ${info.platform}` : "";
  const paragraphs: string[] = [];

  paragraphs.push(
    `I am applying for the ${info.jobTitle} position at ${info.companyName}${where}${seen}. ` +
    (who
      ? `As ${who}${latest?.company && !featured.includes(latest) ? `, currently at ${latest.company}` : ""}, I build the kind ` +
        `of systems this role is about, and I would like to do that for ${info.companyName}.`
      : `The role matches the work I do best, and I would like to do it for ${info.companyName}.`),
  );

  for (const role of featured) {
    const bullets = [...role.bullets]
      .filter(Boolean)
      .sort((a, b) => (terms.size ? overlap(b, terms) - overlap(a, terms) : 0))
      .slice(0, 2)
      .map(sentence)
      .filter(Boolean);
    if (!bullets.length) continue;
    const at = role.company ? `At ${role.company}` : "In my previous role";
    const as = role.title ? `, as ${role.title},` : ",";
    paragraphs.push(`${at}${as} I ${bullets[0]}` + (bullets[1] ? `. I also ${bullets[1]}.` : "."));
  }
  if (paragraphs.length === 1 && c.summary) paragraphs.push(c.summary);

  if (shownSkills.length) {
    paragraphs.push(
      matchedSkills.length
        ? `Your posting asks for ${list(shownSkills)}. That is the stack I work in every day, so I could contribute ` +
          `from the first weeks rather than after a long ramp-up.`
        : `My core skills are ${list(shownSkills)}, and I would bring them to ${info.companyName} from the first weeks.`,
    );
  }

  const availability = c.availability.trim().replace(/[.\s]+$/, "");
  paragraphs.push(
    `I would welcome a conversation about what ${info.companyName} needs from this role and how I can help. ` +
    `My CV is attached.` +
    (availability ? ` ${availability.charAt(0).toUpperCase()}${availability.slice(1)}.` : ""),
  );

  const projects = pickProjects(c, posting);
  return {
    greeting: greetingFor(info),
    paragraphs,
    ...(projects.length ? { projects } : {}),
    closing: "Kind regards,",
  };
}

function cvForPrompt(c: CVContent): string {
  const lines = [
    `Name: ${c.name}`,
    c.positioning && `Headline: ${c.positioning}`,
    yearsOfExperience(c) > 0 && `Years of experience: ${yearsOfExperience(c)}`,
    c.summary && `Summary: ${c.summary}`,
    c.skills.length && `Skills: ${c.skills.map((g) => `${g.label}: ${g.items}`).join(" | ")}`,
    ...c.experience.slice(0, 5).map((e) => {
      const r = roleParts(e);
      return `Role: ${r.title} at ${r.company} (${e.dates})\n${e.bullets.slice(0, 6).map((b) => `- ${b}`).join("\n")}`;
    }),
    (c.projects ?? []).length > 0 &&
      `Projects:\n${c.projects.slice(0, 12).map((p) => `- ${[p.name, p.stack && `(${p.stack})`, p.text].filter(Boolean).join(" ")}`).join("\n")}`,
    c.education?.length && `Education: ${c.education.map((e) => [e.degree, e.school].filter(Boolean).join(", ")).join(" | ")}`,
    c.languages?.length && `Languages: ${c.languages.map((l) => [l.name, l.level].filter(Boolean).join(" ")).join(", ")}`,
    c.availability && `Availability: ${c.availability}`,
  ];
  return lines.filter(Boolean).join("\n").slice(0, 11000);
}

export function buildCoverLetterPrompt(c: CVContent, info: AppInfo, correction = ""): string {
  const posting = [info.jobDescription, info.notes].filter(Boolean).join("\n").slice(0, 9000);
  return [
    "Write a modern cover letter for this job application. Return only JSON:",
    '{"greeting": "...", "paragraphs": ["...", "..."], "projects": ["...", "..."], "closing": "..."}',
    "",
    "Structure:",
    `- Paragraph 1: the role and company${info.platform ? ` and that it was advertised on ${info.platform}` : ""}, then one sentence on why this candidate fits what this company needs. Never open with "I am writing to".`,
    "- Paragraphs 2-3: one paragraph for each of the one or two most relevant employers. Name the employer and the job title, and give two concrete achievements from the CV, with numbers where the CV has them, tied to what the posting asks for.",
    "- Paragraph 4: the skills from the posting the candidate actually has, and how they would use them in this role.",
    "- Last paragraph: a short call to action that says the CV is attached and, if the CV gives it, availability.",
    "- projects: 2 to 4 CV projects most relevant to this posting, each one line such as \"Name – link or what it is (year, stack)\". Use only projects in the CV; return [] if none fit.",
    "",
    "Rules:",
    "- 280-400 words in the paragraphs. No headings or bullets inside paragraphs, no placeholders.",
    "- Use only facts from the CV below. Never invent employers, numbers, links, degrees or skills.",
    "- Introduce the candidate with the job title from the CV that best fits this posting and their years of experience. Do not copy the CV headline word for word.",
    "- Plain, confident, specific. Avoid: \"passionate\", \"proven track record\", \"dynamic team\", \"I am confident\", \"strong fit\", \"team player\", \"hit the ground running\".",
    "- Write in the same language as the job posting.",
    `- Greeting: ${info.contactName ? `address ${info.contactName} by name` : "\"Dear Hiring Manager,\" (or the posting's language equivalent)"}.`,
    "- Closing: a short sign-off line such as \"Kind regards,\" without the name.",
    correction ? `- The candidate asked for these changes:\n${fence("correction", correction.slice(0, 2000))}` : "",
    "",
    `Company: ${info.companyName}`,
    `Role: ${info.jobTitle}`,
    info.location ? `Location: ${info.location}` : "",
    info.platform ? `Advertised on: ${info.platform}` : "",
    "",
    fence("job_posting", posting || "(no posting text — write from the role title and the CV)"),
    "",
    fence("cv", cvForPrompt(c)),
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

  const run = await runAiJsonTask({
    task: "cover-letter.write",
    actor: opts.actor,
    prompt: buildCoverLetterPrompt(opts.content, opts.info, opts.correction),
    maxOutputTokens: 2000,
    userKey: opts.userKey,
    schema: coverLetterSchema,
    kind: "object",
    schemaHint: '{"greeting": string, "paragraphs": string[], "projects": string[], "closing": string}',
  });

  if (!run.ok) {
    return { letter: fallback, mode: "heuristic", note: `${run.message} Showing a keyword-based draft instead.`, providerLabel: "" };
  }

  const letter = sanitizeLetter(run.value) ?? fallback;
  return {
    letter,
    mode: "ai",
    note: `${run.meta.providerLabel} wrote this letter for ${opts.info.companyName}. Edit any paragraph before accepting.`,
    providerLabel: run.meta.providerLabel,
  };
}

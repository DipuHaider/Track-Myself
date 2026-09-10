import type { CVContent } from "@/types/cv";
import { DEFAULT_CV_CONTENT, normaliseContent } from "@/lib/cv/content";

/**
 * Turns the raw text of a CV into CVContent.
 *
 * This is the heuristic implementation. It is deliberately behind a narrow interface
 * (`ParsedCV`, `parseCVText`) so an AI extractor can replace it without touching the
 * merge logic or the API route — see the note at the bottom.
 */

export type ParsedCV = {
  content: CVContent;
  /** Which fields the parser is confident about — the merge step trusts these. */
  found: string[];
  /** How much of the text it could account for, 0–1. Low means "ask the user". */
  coverage: number;
};

const HEADING_ALIASES: Record<string, string> = {
  summary: "summary", profile: "summary", about: "summary", objective: "summary",
  "personal statement": "summary", "professional summary": "summary", "career summary": "summary",
  experience: "experience", "work experience": "experience", employment: "experience",
  "professional experience": "experience", "work history": "experience", "career history": "experience",
  education: "education", "education and training": "education", qualifications: "education",
  academic: "education", "academic background": "education",
  skills: "skills", "technical skills": "skills", competencies: "skills",
  "core competencies": "skills", "key skills": "skills", expertise: "skills",
  languages: "languages", "language skills": "languages",
  projects: "projects", "selected projects": "projects", "key projects": "projects",
  certifications: "certifications", certificates: "certifications", licences: "certifications",
  awards: "awards", honours: "awards", achievements: "awards",
  interests: "interests", hobbies: "interests",
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /((?:https?:\/\/)?(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[\w\-./?%&=+#]*)?)/gi;
const BULLET_RE = /^\s*[•▪◦‣·*\-–—]\s+/;
const DATE_RANGE_RE =
  /((?:19|20)\d{2}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(?:19|20)?\d{2,4})\s*[–—\-to]{1,3}\s*((?:19|20)\d{2}|present|current|now|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(?:19|20)?\d{2,4})/i;

function normaliseHeading(line: string): string | null {
  const clean = line.replace(/[:\-–—|]+$/g, "").trim().toLowerCase();
  if (clean.length > 42) return null;
  return HEADING_ALIASES[clean] ?? null;
}

function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 42) return false;
  if (BULLET_RE.test(t)) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;
  const upperRatio = letters.replace(/[^A-Z]/g, "").length / letters.length;
  return upperRatio > 0.75 || Boolean(normaliseHeading(t));
}

/** Splits the document into { heading -> lines } using whichever headings it finds. */
function sectionise(lines: string[]) {
  const sections: Record<string, string[]> = { _head: [] };
  let current = "_head";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const key = normaliseHeading(line);
    if (key) { current = key; sections[key] ??= []; continue; }
    if (looksLikeHeading(line) && sections[current]?.length) {
      const guess = normaliseHeading(line);
      if (guess) { current = guess; sections[current] ??= []; continue; }
    }
    (sections[current] ??= []).push(line);
  }
  return sections;
}

function parseExperience(lines: string[]) {
  const roles: CVContent["experience"] = [];
  let current: CVContent["experience"][number] | null = null;

  for (const line of lines) {
    if (BULLET_RE.test(line)) {
      current?.bullets.push(line.replace(BULLET_RE, "").trim());
      continue;
    }

    const dates = line.match(DATE_RANGE_RE);
    const parts = line.split(/\s+[|·–—]\s+|\s{2,}|\s+at\s+/i).map((p) => p.trim()).filter(Boolean);

    /* a line with a date range, or two-plus segments, starts a new role */
    if (dates || parts.length >= 2) {
      if (current) roles.push(current);
      const withoutDates = line.replace(DATE_RANGE_RE, "").replace(/[|·–—]\s*$/, "").trim();
      const seg = withoutDates.split(/\s+[|·]\s+|\s{2,}|\s+at\s+/i).map((p) => p.trim()).filter(Boolean);
      current = {
        title: seg[0] ?? withoutDates,
        company: seg[1] ?? "",
        location: seg[2] ?? "",
        grade: "",
        dates: dates ? dates[0] : "",
        bullets: [],
      };
    } else if (current && !current.company) {
      current.company = line;
    } else if (current) {
      current.bullets.push(line);
    }
  }
  if (current) roles.push(current);
  return roles.filter((r) => r.title);
}

function parseEducation(lines: string[]) {
  const out: CVContent["education"] = [];
  for (const line of lines) {
    if (BULLET_RE.test(line) && out.length) {
      out[out.length - 1].note = [out[out.length - 1].note, line.replace(BULLET_RE, "").trim()]
        .filter(Boolean).join(" · ");
      continue;
    }
    const dates = line.match(DATE_RANGE_RE) ?? line.match(/\b(19|20)\d{2}\b/);
    const withoutDates = line.replace(DATE_RANGE_RE, "").replace(/\b(19|20)\d{2}\b/g, "").trim();
    const parts = withoutDates.split(/\s+[|·–—,]\s+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;
    out.push({
      degree: parts[0],
      school: parts[1] ?? "",
      dates: dates ? dates[0] : "",
      note: parts.slice(2).join(" · "),
    });
  }
  return out;
}

function parseSkills(lines: string[]) {
  const groups: CVContent["skills"] = [];
  for (const raw of lines) {
    const line = raw.replace(BULLET_RE, "").trim();
    const colon = line.indexOf(":");
    if (colon > 0 && colon < 40) {
      groups.push({ label: line.slice(0, colon).trim(), items: line.slice(colon + 1).trim() });
    } else if (line) {
      const last = groups[groups.length - 1];
      if (last && !last.label) last.items = [last.items, line].filter(Boolean).join(", ");
      else groups.push({ label: "", items: line });
    }
  }
  return groups.filter((g) => g.items);
}

function parseLanguages(lines: string[]) {
  const out: CVContent["languages"] = [];
  for (const raw of lines) {
    const line = raw.replace(BULLET_RE, "").trim();
    for (const chunk of line.split(/[,;]/).map((c) => c.trim()).filter(Boolean)) {
      const m = chunk.match(/^(.+?)\s*[—–\-(:]\s*([^)]+)\)?$/);
      const name = (m ? m[1] : chunk).trim();
      const level = (m ? m[2] : "").trim();
      if (!name || name.length > 30) continue;
      out.push({ name, level, mother: /native|mother/i.test(level), cefr: {} as never });
    }
  }
  return out;
}

export function parseCVText(text: string): ParsedCV {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const sections = sectionise(lines);
  const head = sections._head ?? [];
  const whole = text;

  const email = whole.match(EMAIL_RE)?.[0] ?? "";
  const phone = whole.match(PHONE_RE)?.[0]?.trim() ?? "";

  const urls = [...whole.matchAll(URL_RE)].map((m) => m[1])
    .filter((u) => !u.includes("@"))
    .map((u) => u.replace(/[.,;)]+$/, ""));
  const linkedin = urls.find((u) => /linkedin\./i.test(u)) ?? "";
  const github = urls.find((u) => /github\./i.test(u)) ?? "";
  const portfolio = urls.find((u) => !/linkedin\.|github\./i.test(u)) ?? "";

  /* the name is usually the first line that is not contact detail */
  const name = head.find((l) =>
    l.length > 2 && l.length < 50 &&
    !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !/^https?:/i.test(l) &&
    /^[A-Za-zÀ-ÿ'.\- ]+$/.test(l)) ?? "";

  const positioning = head.find((l) =>
    l !== name && l.length > 2 && l.length < 60 &&
    !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !/^https?:/i.test(l)) ?? "";

  const experience = parseExperience(sections.experience ?? []);
  const education = parseEducation(sections.education ?? []);
  const skills = parseSkills(sections.skills ?? []);
  const languages = parseLanguages(sections.languages ?? []);
  const summary = (sections.summary ?? []).join(" ").trim();
  const certifications = (sections.certifications ?? []).map((l) => l.replace(BULLET_RE, "").trim()).filter(Boolean);
  const awards = (sections.awards ?? []).map((l) => l.replace(BULLET_RE, "").trim()).filter(Boolean);

  const content = normaliseContent({
    ...DEFAULT_CV_CONTENT,
    name,
    positioning: positioning === name ? "" : positioning,
    contact: {
      ...DEFAULT_CV_CONTENT.contact,
      email, phone, linkedin, github, portfolio,
    },
    summary,
    experience,
    education,
    skills,
    languages,
    certifications,
    awards,
  });

  const found: string[] = [];
  if (content.name) found.push("name");
  if (content.contact.email) found.push("email");
  if (content.contact.phone) found.push("phone");
  if (content.summary) found.push("summary");
  if (content.experience.length) found.push(`experience (${content.experience.length})`);
  if (content.education.length) found.push(`education (${content.education.length})`);
  if (content.skills.length) found.push(`skills (${content.skills.length})`);
  if (content.languages.length) found.push(`languages (${content.languages.length})`);

  /* rough share of the source text that ended up somewhere structured */
  const captured =
    content.summary.length +
    content.experience.reduce((n, r) => n + r.title.length + r.company.length + r.bullets.join("").length, 0) +
    content.education.reduce((n, e) => n + e.degree.length + e.school.length, 0) +
    content.skills.reduce((n, s) => n + s.label.length + s.items.length, 0);
  const coverage = text.length ? Math.min(1, captured / text.length) : 0;

  return { content, found, coverage };
}

/**
 * The seam for AI extraction. Swap the body for an Anthropic call that returns
 * CVContent and everything downstream keeps working — the merge step and the API
 * route only depend on this signature.
 */
export async function parseCV(text: string): Promise<ParsedCV> {
  return parseCVText(text);
}

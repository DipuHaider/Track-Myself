import type { CVContent } from "@/types/cv";
import { normaliseContent } from "@/lib/cv/content";
import type { Application } from "@/types/application";

/**
 * Combines the CV data sources into the one CVContent every builder renders from.
 *
 * Precedence, weakest first:
 *   1. parsed uploaded CVs   — oldest file first, so a newer upload wins
 *   2. imported JSON         — an explicit, structured statement of intent
 *   3. the CV Builder form   — what the user typed most recently, so it wins
 *
 * A field only overrides when it actually has a value; an empty form field never
 * wipes something that came out of an uploaded CV. Lists take the longest version
 * rather than concatenating, because concatenating produces duplicate roles.
 */

export type MergeSource = {
  label: string;
  content: CVContent;
  /** Higher wins. Uploaded files 1, JSON 2, form 3. */
  weight: number;
};

export function mergeCVSources(sources: MergeSource[]): {
  content: CVContent;
  usedFrom: Record<string, string[]>;
} {
  const ordered = [...sources].sort((a, b) => a.weight - b.weight);
  const usedFrom: Record<string, string[]> = {};

  const credit = (field: string, label: string) => {
    (usedFrom[field] ??= []).push(label);
  };

  /* strongest first, so the first non-empty value found is the highest-precedence one */
  const desc = [...ordered].reverse();

  const pick = (field: string, get: (c: CVContent) => string): string => {
    for (const s of desc) {
      const v = get(s.content);
      if (v && v.trim()) { credit(field, s.label); return v; }
    }
    return "";
  };

  const pickList = <T>(field: string, get: (c: CVContent) => T[]): T[] => {
    let best: T[] = [];
    let from = "";
    for (const s of desc) {
      const list = get(s.content);
      if (list.length > best.length) { best = list; from = s.label; }
    }
    if (from) credit(field, from);
    return best;
  };

  const merged = normaliseContent({
    name: pick("name", (c) => c.name),
    positioning: pick("positioning", (c) => c.positioning),
    gradeTitle: pick("gradeTitle", (c) => c.gradeTitle),
    contact: {
      city: pick("contact.city", (c) => c.contact.city),
      addressFull: pick("contact.addressFull", (c) => c.contact.addressFull),
      phone: pick("contact.phone", (c) => c.contact.phone),
      email: pick("contact.email", (c) => c.contact.email),
      linkedin: pick("contact.linkedin", (c) => c.contact.linkedin),
      github: pick("contact.github", (c) => c.contact.github),
      portfolio: pick("contact.portfolio", (c) => c.contact.portfolio),
    },
    personal: {
      dob: pick("personal.dob", (c) => c.personal.dob),
      dobLong: pick("personal.dobLong", (c) => c.personal.dobLong),
      nationality: pick("personal.nationality", (c) => c.personal.nationality),
    },
    summary: pick("summary", (c) => c.summary),
    summaryShort: pick("summaryShort", (c) => c.summaryShort),
    availability: pick("availability", (c) => c.availability),
    skills: pickList("skills", (c) => c.skills),
    skillsCompact: pickList("skillsCompact", (c) => c.skillsCompact),
    experience: pickList("experience", (c) => c.experience),
    projects: pickList("projects", (c) => c.projects),
    education: pickList("education", (c) => c.education),
    certifications: pickList("certifications", (c) => c.certifications),
    awards: pickList("awards", (c) => c.awards),
    languages: pickList("languages", (c) => c.languages),
    photo: pick("photo", (c) => c.photo),
    signatureCity: pick("signatureCity", (c) => c.signatureCity),
  });

  return { content: merged, usedFrom };
}

/**
 * Job-specific layer. Takes the merged CV and the application the Docs menu was
 * opened from, and biases the CV towards that role without inventing anything:
 * skill groups whose items appear in the job post move to the front, and the
 * positioning line adopts the target job title when the user has not set one.
 */
export function tailorToApplication(content: CVContent, app: Partial<Application>): CVContent {
  const haystack = [
    app.jobTitle, app.companyName, app.notes, app.jobPostUrl,
    app.location, app.platform,
  ].filter(Boolean).join(" ").toLowerCase();

  if (!haystack.trim()) return content;

  const score = (text: string) =>
    text
      .split(/[,;/]/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 1)
      .reduce((n, term) => (haystack.includes(term) ? n + 1 : n), 0);

  const skills = [...content.skills]
    .map((g, i) => ({ g, i, s: score(`${g.label}, ${g.items}`) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map((x) => x.g);

  const experience = [...content.experience]
    .map((r, i) => ({ r, i, s: score([r.title, r.company, r.bullets.join(", ")].join(", ")) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map((x) => x.r);

  return {
    ...content,
    positioning: content.positioning || app.jobTitle || "",
    skills,
    /* only reorder experience when the job post actually matched something —
       otherwise chronological order is the right order */
    experience: experience.some((r, i) => r !== content.experience[i]) ? experience : content.experience,
  };
}

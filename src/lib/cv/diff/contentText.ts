import { effectiveSkills, effectiveSummary } from "@/lib/cv/content";
import type { CVContent, CVFormat, CVVariant } from "@/types/cv";

export type DocSpec = {
  docType: "cv" | "resume" | "cover-letter";
  format: CVFormat;
  variant: CVVariant;
};

export const SECTION_LABELS: Record<string, string> = {
  _head: "Header",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  projects: "Projects",
  certifications: "Certifications",
  awards: "Awards",
  interests: "Interests",
};

export const SECTION_ORDER = [
  "_head", "summary", "experience", "skills", "projects",
  "education", "certifications", "awards", "languages", "interests",
];

/**
 * The right-hand side of a review diff, keyed by the same section names the left
 * side is bucketed into. Deriving it from content rather than re-extracting the
 * rendered file is what makes the alignment exact on one side.
 *
 * Mirrors the builders' variant rules — keep in sync with src/lib/cv/docx/ats.ts.
 */
export function contentToSections(content: CVContent, spec: DocSpec): Record<string, string> {
  const compact = spec.variant === "compact";
  const out: Record<string, string> = {};
  const put = (key: string, value: string) => {
    const v = value.trim();
    if (v) out[key] = v;
  };

  put("_head", [
    content.name,
    content.positioning || content.gradeTitle,
    [content.contact.city, content.contact.phone, content.contact.email]
      .filter(Boolean).join(" | "),
    [content.contact.linkedin, content.contact.github, content.contact.portfolio]
      .filter(Boolean).join(" | "),
  ].filter(Boolean).join("\n"));

  put("summary", effectiveSummary(content, spec.variant));

  put("experience", content.experience
    .map((role) => [
      [role.title, role.company, role.location, role.dates].filter(Boolean).join(" · "),
      ...role.bullets.map((b) => `- ${b}`),
    ].join("\n"))
    .join("\n\n"));

  put("skills", effectiveSkills(content, spec.variant)
    .map((g) => `${g.label}: ${g.items}`)
    .join("\n"));

  /* The compact ATS variant drops projects to hold the page count. */
  if (!compact) {
    put("projects", content.projects
      .map((p) => [[p.name, p.stack].filter(Boolean).join(" — "), p.text].filter(Boolean).join("\n"))
      .join("\n\n"));
  }

  put("education", content.education
    .map((e) => [`${e.degree}, ${e.school}`, e.dates, e.note].filter(Boolean).join(" · "))
    .join("\n"));

  put("certifications", content.certifications.join("\n"));
  put("awards", content.awards.join("\n"));
  put("languages", content.languages
    .map((l) => {
      const level = l.level || (l.mother ? "Mother tongue" : "");
      return level ? `${l.name} (${level})` : l.name;
    })
    .join("\n"));

  return out;
}

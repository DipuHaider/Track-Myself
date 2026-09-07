import type {
  CEFRGrid, CVContent, CVEducation, CVExperience,
  CVLanguage, CVProject, CVSkillGroup,
} from "@/types/cv";

export const EMPTY_CEFR: CEFRGrid = {
  listening: "",
  reading: "",
  spokenInteraction: "",
  spokenProduction: "",
  writing: "",
};

export const DEFAULT_CV_CONTENT: CVContent = {
  name: "",
  positioning: "",
  gradeTitle: "",
  contact: {
    city: "", addressFull: "", phone: "", email: "",
    linkedin: "", github: "", portfolio: "", huggingface: "",
  },
  personal: { dob: "", dobLong: "", nationality: "" },
  summary: "",
  summaryShort: "",
  availability: "",
  skills: [],
  skillsCompact: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  awards: [],
  languages: [],
  photo: "",
  signatureCity: "",
};

const SPLITTERS = /\s+[·|—]\s+|\s+\|\s+/;
const BULLET_PREFIX = /^\s*[•\-–*]\s+/;
const DATE_HINT = /\d{4}|present|current|now/i;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter((s) => s.trim().length > 0) : [];
}

function blocks(text: string): string[][] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);
}

export function parseExperience(text: string): CVExperience[] {
  return blocks(text).map((lines) => {
    const [header, ...rest] = lines;
    const parts = header.split(SPLITTERS).map((p) => p.trim()).filter(Boolean);

    const dates = parts.find((p) => DATE_HINT.test(p)) ?? "";
    const named = parts.filter((p) => p !== dates);

    return {
      title: named[0] ?? header,
      company: named[1] ?? "",
      location: named[2] ?? "",
      grade: named.slice(3).join(" · "),
      dates,
      bullets: rest.map((l) => l.replace(BULLET_PREFIX, "").trim()).filter(Boolean),
    };
  });
}

export function parseEducation(text: string): CVEducation[] {
  return blocks(text).map((lines) => {
    const [header, ...rest] = lines;
    const parts = header.split(SPLITTERS).map((p) => p.trim()).filter(Boolean);
    const dates = parts.find((p) => DATE_HINT.test(p)) ?? "";
    const named = parts.filter((p) => p !== dates);

    return {
      degree: named[0] ?? header,
      school: named[1] ?? "",
      dates,
      note: rest.join(" ").trim(),
    };
  });
}

export function parseSkills(text: string): CVSkillGroup[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const groups: CVSkillGroup[] = [];
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx > 0 && idx < 40) {
      groups.push({ label: line.slice(0, idx).trim(), items: line.slice(idx + 1).trim() });
    } else {
      groups.push({ label: groups.length === 0 ? "Skills" : "More", items: line });
    }
  }
  return groups;
}

export function parseLanguages(text: string): CVLanguage[] {
  return text
    .split(/[,\n]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/^(.+?)\s*\((.+)\)\s*$/);
      const name = (match ? match[1] : chunk).trim();
      const level = (match ? match[2] : "").trim();
      const native = /native|mother/i.test(level);
      return { name, level, mother: native, cefr: { ...EMPTY_CEFR } };
    });
}

export function skillGroup(v: unknown): CVSkillGroup[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((row) => {
      const r = row as Record<string, unknown>;
      return { label: str(r?.label), items: str(r?.items) };
    })
    .filter((g) => g.label || g.items);
}

function experienceArray(v: unknown): CVExperience[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      company: str(r?.company),
      location: str(r?.location),
      title: str(r?.title),
      grade: str(r?.grade),
      dates: str(r?.dates),
      bullets: strArray(r?.bullets),
    };
  });
}

function projectArray(v: unknown): CVProject[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = row as Record<string, unknown>;
    return { name: str(r?.name), stack: str(r?.stack), text: str(r?.text) };
  });
}

function educationArray(v: unknown): CVEducation[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      degree: str(r?.degree),
      school: str(r?.school),
      dates: str(r?.dates),
      note: str(r?.note),
    };
  });
}

function languageArray(v: unknown): CVLanguage[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = row as Record<string, unknown>;
    const cefr = (r?.cefr ?? {}) as Record<string, unknown>;
    return {
      name: str(r?.name),
      level: str(r?.level),
      mother: Boolean(r?.mother),
      cefr: {
        listening: str(cefr.listening),
        reading: str(cefr.reading),
        spokenInteraction: str(cefr.spokenInteraction),
        spokenProduction: str(cefr.spokenProduction),
        writing: str(cefr.writing),
      },
    };
  });
}

export function normaliseContent(raw: unknown): CVContent {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const contact = (d.contact ?? {}) as Record<string, unknown>;
  const personal = (d.personal ?? {}) as Record<string, unknown>;

  return {
    name: str(d.name),
    positioning: str(d.positioning),
    gradeTitle: str(d.gradeTitle),
    contact: {
      city: str(contact.city),
      addressFull: str(contact.addressFull),
      phone: str(contact.phone),
      email: str(contact.email),
      linkedin: str(contact.linkedin),
      github: str(contact.github),
      portfolio: str(contact.portfolio),
      huggingface: str(contact.huggingface),
    },
    personal: {
      dob: str(personal.dob),
      dobLong: str(personal.dobLong),
      nationality: str(personal.nationality),
    },
    summary: str(d.summary),
    summaryShort: str(d.summaryShort),
    availability: str(d.availability),
    skills: skillGroup(d.skills),
    skillsCompact: skillGroup(d.skillsCompact),
    experience: experienceArray(d.experience),
    projects: projectArray(d.projects),
    education: educationArray(d.education),
    certifications: strArray(d.certifications),
    awards: strArray(d.awards),
    languages: languageArray(d.languages),
    photo: str(d.photo),
    signatureCity: str(d.signatureCity),
  };
}

export function isContentEmpty(c: CVContent) {
  return (
    !c.name &&
    !c.summary &&
    c.experience.length === 0 &&
    c.education.length === 0 &&
    c.skills.length === 0
  );
}

export type LegacyFlatCV = {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  languages?: string;
  photo?: string;
};

export function importFromLegacy(flat: LegacyFlatCV): CVContent {
  const content = { ...DEFAULT_CV_CONTENT };

  return {
    ...content,
    name: str(flat.name),
    positioning: str(flat.title),
    contact: {
      ...content.contact,
      city: str(flat.location),
      addressFull: str(flat.location),
      phone: str(flat.phone),
      email: str(flat.email),
      linkedin: str(flat.linkedin),
      portfolio: str(flat.website),
      github: "",
      huggingface: "",
    },
    summary: str(flat.summary),
    summaryShort: str(flat.summary).split(/(?<=\.)\s+/).slice(0, 2).join(" "),
    skills: parseSkills(str(flat.skills)),
    skillsCompact: [],
    experience: parseExperience(str(flat.experience)),
    education: parseEducation(str(flat.education)),
    languages: parseLanguages(str(flat.languages)),
    photo: str(flat.photo),
    signatureCity: str(flat.location).split(",")[0]?.trim() ?? "",
  };
}

export function effectiveSkills(c: CVContent, variant: "full" | "compact"): CVSkillGroup[] {
  if (variant === "compact" && c.skillsCompact.length > 0) return c.skillsCompact;
  return c.skills;
}

export function effectiveSummary(c: CVContent, variant: "full" | "compact"): string {
  if (variant === "compact" && c.summaryShort.trim()) return c.summaryShort;
  return c.summary;
}

export function contactLine(c: CVContent): string {
  return [c.contact.city, c.contact.phone, c.contact.email].filter(Boolean).join("  |  ");
}

export function linkLine(c: CVContent): string {
  return [c.contact.linkedin, c.contact.github, c.contact.portfolio].filter(Boolean).join("  |  ");
}

export function safeFileName(s: string) {
  return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "CV";
}

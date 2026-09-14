import type { AppInfo } from "@/lib/cv/docx/coverLetter";
import type { CVContent, CVFormat, CVVariant } from "@/types/cv";

export type GenDocType = "cv" | "resume" | "cover-letter";

const FORMAT_SLUGS: Record<CVFormat, string> = {
  ats: "ATS",
  europass: "Europass",
  designer: "Designer",
  lebenslauf: "Lebenslauf",
};

/**
 * Hyphens inside a part, underscores between parts — so the parts stay legible
 * once the file is sitting in a Downloads folder with no folder tree around it.
 *
 * Deliberately not safeFileName() from content.ts: that collapses every run of
 * non-alphanumerics to "_", which would render "Senior Backend Engineer" as
 * "Senior_Backend_Engineer" and lose the part boundaries. It still backs plain-CV
 * downloads elsewhere, so it is left alone.
 */
export function slugPart(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatSlug(format: CVFormat, variant: CVVariant, docType: GenDocType): string {
  if (docType === "cover-letter") return "Cover-Letter";
  if (docType === "resume") return "Resume";
  const base = FORMAT_SLUGS[format] ?? "CV";
  return format === "ats" && variant === "compact" ? `${base}-Compact` : base;
}

export function isoToday(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Company_Role_Format_ISO-date.ext, e.g.
 *   Northwind_Senior-Backend-Engineer_ATS-Compact_2026-09-13.pdf
 *
 * A plain CV has no application attached, so it leads with the person instead.
 */
export function generatedFileName(spec: {
  content: CVContent;
  info?: AppInfo;
  docType: GenDocType;
  format: CVFormat;
  variant: CVVariant;
  output: "docx" | "pdf";
  date?: Date;
}): { name: string; isoDate: string } {
  const isoDate = isoToday(spec.date ?? new Date());
  const ext = spec.output === "pdf" ? "pdf" : "docx";
  const label = formatSlug(spec.format, spec.variant, spec.docType);

  const lead = spec.info?.companyName
    ? [slugPart(spec.info.companyName), slugPart(spec.info.jobTitle ?? "")]
    : [slugPart(spec.content.name || "CV")];

  const parts = [...lead, label, isoDate].filter(Boolean);
  return { name: `${parts.join("_")}.${ext}`, isoDate };
}

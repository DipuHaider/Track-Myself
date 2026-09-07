import { Packer } from "docx";
import type { CVContent, CVFormat, CVVariant } from "@/types/cv";
import { safeFileName } from "@/lib/cv/content";
import { buildATS } from "./ats";
import { buildCoverLetter, type AppInfo } from "./coverLetter";
import { buildDesigner } from "./designer";
import { buildEuropass } from "./europass";
import { buildLebenslauf } from "./lebenslauf";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const FORMAT_LABELS: Record<CVFormat, string> = {
  ats: "CV",
  europass: "Europass_CV",
  designer: "Designer_CV",
  lebenslauf: "Lebenslauf",
};

export type { AppInfo } from "./coverLetter";

export function buildCVDocument(content: CVContent, format: CVFormat, variant: CVVariant) {
  if (format === "europass") return buildEuropass(content);
  if (format === "designer") return buildDesigner(content);
  if (format === "lebenslauf") return buildLebenslauf(content);
  return buildATS(content, variant);
}

export async function renderCVDocx(
  content: CVContent,
  format: CVFormat,
  variant: CVVariant = "full",
): Promise<Buffer> {
  return Packer.toBuffer(buildCVDocument(content, format, variant));
}

export function cvFileName(content: CVContent, format: CVFormat, variant: CVVariant) {
  const person = safeFileName(content.name || "CV");
  const suffix = format === "ats" && variant === "compact" ? "_2page" : "";
  return `${person}_${FORMAT_LABELS[format]}${suffix}.docx`;
}

export async function renderCoverLetterDocx(content: CVContent, info: AppInfo): Promise<Buffer> {
  return Packer.toBuffer(buildCoverLetter(content, info));
}

export async function renderTailoredResumeDocx(
  content: CVContent,
  info: AppInfo,
  variant: CVVariant = "compact",
): Promise<Buffer> {
  const banner = `Tailored for ${info.jobTitle} at ${info.companyName}` +
    (info.location ? ` · ${info.location}` : "");
  return Packer.toBuffer(buildATS(content, variant, banner));
}

export function appDocFileName(
  content: CVContent,
  info: AppInfo,
  docType: "cv" | "resume" | "cover-letter",
) {
  const label = docType === "cover-letter" ? "Cover_Letter" : docType === "resume" ? "Resume" : "CV";
  const parts = [
    safeFileName(info.companyName),
    safeFileName(info.jobTitle),
    label,
  ].filter(Boolean);
  return `${parts.join("_")}.docx`;
}

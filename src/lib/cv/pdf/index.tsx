import { renderToBuffer } from "@react-pdf/renderer";
import type { CVContent, CVFormat, CVVariant } from "@/types/cv";
import { safeFileName } from "@/lib/cv/content";
import { FORMAT_LABELS, type AppInfo } from "@/lib/cv/docx";
import { ATSDocument } from "./ats";
import { CoverLetterDocument } from "./coverLetter";
import { DesignerDocument } from "./designer";
import { EuropassDocument } from "./europass";
import { LebenslaufDocument } from "./lebenslauf";

export const PDF_MIME = "application/pdf";

function documentFor(content: CVContent, format: CVFormat, variant: CVVariant, tailoredFor = "") {
  if (format === "europass") return <EuropassDocument content={content} />;
  if (format === "designer") return <DesignerDocument content={content} />;
  if (format === "lebenslauf") return <LebenslaufDocument content={content} />;
  return <ATSDocument content={content} variant={variant} tailoredFor={tailoredFor} />;
}

export async function renderCVPdf(
  content: CVContent,
  format: CVFormat,
  variant: CVVariant = "full",
): Promise<Buffer> {
  return renderToBuffer(documentFor(content, format, variant));
}

export async function renderTailoredResumePdf(
  content: CVContent,
  info: AppInfo,
  variant: CVVariant = "compact",
): Promise<Buffer> {
  const banner = `Tailored for ${info.jobTitle} at ${info.companyName}` +
    (info.location ? ` · ${info.location}` : "");
  return renderToBuffer(documentFor(content, "ats", variant, banner));
}

export async function renderCoverLetterPdf(content: CVContent, info: AppInfo): Promise<Buffer> {
  return renderToBuffer(<CoverLetterDocument content={content} info={info} />);
}

/** Same naming as the .docx path, so a user's files sort together. */
export function cvPdfFileName(content: CVContent, format: CVFormat, variant: CVVariant) {
  const person = safeFileName(content.name || "CV");
  const suffix = format === "ats" && variant === "compact" ? "_2page" : "";
  return `${person}_${FORMAT_LABELS[format]}${suffix}.pdf`;
}

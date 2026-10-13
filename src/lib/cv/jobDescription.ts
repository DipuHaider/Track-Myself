import { JD_MAX } from "@/lib/cv/ai/adapt";
import type { AppInfo } from "@/lib/cv/docx";

export function jobDescriptionFrom(info: AppInfo): string {
  return [
    info.jobDescription,
    info.jobTitle,
    info.companyName,
    info.location,
    info.platform,
    info.jobPostUrl,
    info.notes,
  ].filter(Boolean).join("\n").slice(0, JD_MAX);
}

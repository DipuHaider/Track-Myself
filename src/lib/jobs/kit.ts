import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import JobLead from "@/models/JobLead";
import { loadJobHunt } from "@/lib/jobs/access";
import { sanitizeLetter } from "@/lib/cv/coverLetter";

const KIT_MAX_BYTES = 3 * 1024 * 1024;
const KIT_STATUSES = new Set(["ready", "applying"]);

export type ApplyKit = {
  lead: { id: string; company: string; title: string; platform: string; applyUrl: string };
  applicant: {
    fullName: string; firstName: string; lastName: string; email: string; phone: string; city: string;
    linkedinUrl: string; websiteUrl: string; salaryExpectation: string; noticePeriod: string; workPermit: string; startDate: string;
  };
  screening: { question: string; answer: string }[];
  coverLetterText: string;
  files: { kind: "cv" | "cover-letter"; name: string; mimeType: string; base64: string }[];
};

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function letterText(raw: unknown): string {
  const l = sanitizeLetter(raw);
  if (!l) return "";
  return [l.greeting, ...l.paragraphs, l.closing].filter(Boolean).join("\n\n");
}

/* Everything the extension needs to fill one application form, served only
   for a lead the owner has prepared and approved. Files are the documents
   prepareLead saved; nothing else from My Docs is reachable this way. */
export async function buildApplyKit(
  user: { id: string; name: string; email: string },
  leadId: string,
): Promise<ApplyKit | { error: string; status: number }> {
  await dbConnect();
  const lead = (await JobLead.findOne({ _id: leadId, userId: user.id }, "company title platform applyUrl url status cvFileIds prepared.letter").lean()) as
    | { _id: { toString(): string }; company: string; title: string; platform?: string; applyUrl?: string; url?: string; status: string; cvFileIds?: string[]; prepared?: { letter?: unknown } }
    | null;
  if (!lead) return { error: "Not found", status: 404 };
  if (!KIT_STATUSES.has(lead.status)) return { error: "Prepare and approve this job in TrackMyself first.", status: 409 };

  const settings = await loadJobHunt(user.id);
  const rows = (await CVFile.find({ _id: { $in: lead.cvFileIds ?? [] }, userId: user.id }, "name mimeType data genDocType").lean()) as
    { name: string; mimeType: string; data?: string; genDocType?: string }[];

  let budget = KIT_MAX_BYTES;
  const files: ApplyKit["files"] = [];
  for (const kind of ["resume", "cover-letter"] as const) {
    const row = rows.find((r) => r.genDocType === kind);
    if (!row?.data) continue;
    const bytes = Math.floor((row.data.length * 3) / 4);
    if (bytes > budget) continue;
    budget -= bytes;
    files.push({ kind: kind === "resume" ? "cv" : "cover-letter", name: row.name, mimeType: row.mimeType, base64: row.data });
  }

  const { firstName, lastName } = splitName(user.name);
  return {
    lead: {
      id: lead._id.toString(),
      company: lead.company,
      title: lead.title,
      platform: lead.platform ?? "Other",
      applyUrl: lead.applyUrl || lead.url || "",
    },
    applicant: {
      fullName: user.name,
      firstName,
      lastName,
      email: user.email,
      ...settings.applicant,
    },
    screening: settings.screeningAnswers,
    coverLetterText: letterText(lead.prepared?.letter),
    files,
  };
}

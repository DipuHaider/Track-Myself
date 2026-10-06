export const APPLICATION_STATUSES = [
  "Wishlist",
  "Not Completed",
  "Submitted",
  "No Response",
  "Interview Scheduled",
  "Active - Written",
  "Active - HR",
  "Active - Technical",
  "Active - Cultural Fit",
  "Offer Received",
  "Rejected",
] as const;

/* What a newly captured job starts as. Named rather than positional so the list
   can be reordered without silently changing what the extension saves. */
export const DEFAULT_APPLICATION_STATUS = "Wishlist" as const;

export const SUBMITTED_STATUS = "Submitted" as const;

export const NOT_COMPLETED_STATUS = "Not Completed" as const;

export const NOT_APPLIED_STATUSES: readonly string[] = [DEFAULT_APPLICATION_STATUS, NOT_COMPLETED_STATUS];

export const GHOST_STATUSES: readonly string[] = [...NOT_APPLIED_STATUSES, SUBMITTED_STATUS, "No Response"];

export const PLATFORMS = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Company Website",
  "Facebook Page",
  "Facebook Group",
  "Xing",
  "Referral",
  "Other",
] as const;

export const SUBMISSION_METHODS = [
  "Online / Job Portal",
  "LinkedIn Easy Apply",
  "Indeed Apply",
  "XING Apply",
  "Company Application Form",
  "Email to Contact",
  "Email (General Inbox)",
  "Referred by Contact",
  "Recruitment Agency",
  "In Person",
  "Postal Mail",
  "Job Fair / Event",
  "Message / Call",
  "Other",
] as const;

export const SUBMISSION_DETAIL_METHODS: ReadonlySet<string> = new Set([
  "In Person",
  "Postal Mail",
  "Job Fair / Event",
  "Recruitment Agency",
  "Other",
]);

export const SUBMISSION_DETAIL_HINTS: Record<string, string> = {
  "In Person": "e.g. Hard copy handed to HR, or CV dropped at reception, Hauptstr. 5",
  "Postal Mail": "e.g. Posted to HR, Musterstr. 1, 10115 Berlin",
  "Job Fair / Event": "e.g. Spoke at the Acme booth, Berlin Tech Job Fair",
  "Recruitment Agency": "e.g. Submitted through Hays",
  Other: "How was it submitted?",
};

export const CONTACT_FIRST_METHODS: ReadonlySet<string> = new Set([
  "Email to Contact",
  "Referred by Contact",
  "Recruitment Agency",
  "Message / Call",
]);

export const PROVIDED_DOCUMENTS = [
  "Resume",
  "ATS 3 Page",
  "ATS 2 Page",
  "Europass CV",
  "Designer",
  "Lebenslauf",
  "Cover Letter",
] as const;

export const DOCUMENT_FORMATS = [".pdf", ".docx", ".doc", "Hard copy"] as const;

export const DEFAULT_DOCUMENT_FORMAT = ".pdf";

export const CONTACT_ROLES = [
  "Recruiter",
  "Reference / Referral",
  "Hiring Manager",
  "HR",
  "Other",
] as const;

export const MAX_CONTACTS = 10;

export const MAX_JOB_POST_URLS = 10;

export const JOB_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contract",
  "Freelance",
  "Internship",
  "Working Student",
  "Apprenticeship",
  "Temporary",
  "Volunteer",
  "Remote",
  "Hybrid",
  "On-site",
] as const;

export const WORKPLACE_TYPES = ["Remote", "Hybrid", "On-site"] as const;

export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];

export function parseJobTypes(jobType?: string | null, workplaceType?: string | null): string[] {
  const parts = [...(jobType ?? "").split(","), workplaceType ?? ""]
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

export function joinJobTypes(types: string[]): string {
  const order = JOB_TYPES as readonly string[];
  return [...types]
    .sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))
    .join(", ");
}

export const FACEBOOK_PLATFORMS: ReadonlySet<string> = new Set([
  "Facebook Page",
  "Facebook Group",
]);


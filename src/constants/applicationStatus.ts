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
  "Withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/* The form shows statuses in two levels: a main status, and for the in-process and
   submitted ones a second list (interview stage, or how it was sent). The stored
   value stays the flat string, so filters, analytics and history are unchanged. */
export const ACTIVE_PREFIX = "Active - ";
export const ACTIVE_GROUP = "Active" as const;

export const ACTIVE_STAGES = APPLICATION_STATUSES
  .filter((s) => s.startsWith(ACTIVE_PREFIX))
  .map((s) => s.slice(ACTIVE_PREFIX.length));

export const MAIN_STATUSES: string[] = [
  ...new Set(APPLICATION_STATUSES.map((s) => (s.startsWith(ACTIVE_PREFIX) ? ACTIVE_GROUP : s))),
];

export function mainStatusOf(status: string): string {
  return status.startsWith(ACTIVE_PREFIX) ? ACTIVE_GROUP : status;
}

export function stageOf(status: string): string {
  return status.startsWith(ACTIVE_PREFIX) ? status.slice(ACTIVE_PREFIX.length) : "";
}

export function composeStatus(main: string, stage = ""): string {
  if (main !== ACTIVE_GROUP) return main;
  return `${ACTIVE_PREFIX}${ACTIVE_STAGES.includes(stage) ? stage : ACTIVE_STAGES[0]}`;
}

/* What a newly captured job starts as. Named rather than positional so the list
   can be reordered without silently changing what the extension saves. */
export const DEFAULT_APPLICATION_STATUS = "Wishlist" as const;

export const SUBMITTED_STATUS = "Submitted" as const;

export const NOT_COMPLETED_STATUS = "Not Completed" as const;

export const NOT_APPLIED_STATUSES: readonly string[] = [DEFAULT_APPLICATION_STATUS, NOT_COMPLETED_STATUS];

export const GHOST_STATUSES: readonly string[] = [...NOT_APPLIED_STATUSES, SUBMITTED_STATUS, "No Response"];

export const REJECTED_STATUS = "Rejected" as const;

export const WITHDRAWN_STATUS = "Withdrawn" as const;

/* Finished applications: no follow-ups, no reminders. Withdrawn is the candidate's
   own decision, so it never counts as a reply from the employer. */
export const CLOSED_STATUSES: readonly string[] = ["Offer Received", REJECTED_STATUS, WITHDRAWN_STATUS];

export const REJECTION_FEEDBACK = [
  "No reason given",
  "Generic rejection",
  "Detailed feedback",
  "Positive – keep in touch",
] as const;

export const WARM_LEAD_FEEDBACK = "Positive – keep in touch" as const;

export const OFFER_RECEIVED_STATUS = "Offer Received" as const;

export const OFFER_OUTCOMES = [
  "Verbal offer",
  "Written offer",
  "Negotiating",
  "Accepted",
  "Declined by me",
  "Withdrawn by company",
] as const;

const RESPONSE_OPTIONS: Record<string, readonly string[]> = {
  [REJECTED_STATUS]: REJECTION_FEEDBACK,
  [OFFER_RECEIVED_STATUS]: OFFER_OUTCOMES,
};

export function responseOptionsFor(status: string): readonly string[] {
  return RESPONSE_OPTIONS[status] ?? [];
}

export const PLATFORMS = [
  "LinkedIn",
  "Indeed",
  "Glassdoor",
  "Company Website",
  "Facebook Page",
  "Facebook Group",
  "Xing",
  "StepStone",
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
  "LinkedIn Message",
  "CV Drop",
  "Hand to Hand",
  "Passed On by Contact",
  "Other",
] as const;

export const SUBMISSION_LINK_METHODS: ReadonlySet<string> = new Set([
  "Online / Job Portal",
  "Company Application Form",
]);

export const SUBMISSION_DETAIL_METHODS: ReadonlySet<string> = new Set([
  ...SUBMISSION_LINK_METHODS,
  "CV Drop",
  "Hand to Hand",
  "Passed On by Contact",
  "In Person",
  "Postal Mail",
  "Job Fair / Event",
  "Recruitment Agency",
  "Other",
]);

export const SUBMISSION_DETAIL_HINTS: Record<string, string> = {
  "Online / Job Portal": "https://… link to the portal or your application page",
  "Company Application Form": "https://… link to the company's application form",
  "CV Drop": "e.g. Dropped at the reception, or the company's CV drop box / talent pool",
  "Hand to Hand": "e.g. Handed to the hiring manager at the office",
  "Passed On by Contact": "e.g. Passed to the team lead by Anna Weber",
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
  "LinkedIn Message",
  "Passed On by Contact",
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


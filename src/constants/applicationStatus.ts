export const APPLICATION_STATUSES = [
  "Wishlist",
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

export const FACEBOOK_PLATFORMS: ReadonlySet<string> = new Set([
  "Facebook Page",
  "Facebook Group",
]);

export const DOCUMENT_TYPES = [
  "CV",
  "Cover Letter",
  "Portfolio",
  "Certificates",
  "Transcript",
  "Recommendation Letter",
  "Passport",
  "IELTS",
  "GitHub",
  "LinkedIn",
] as const;

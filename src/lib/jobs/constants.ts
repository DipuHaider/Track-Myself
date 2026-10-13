export const JOB_SOURCES = ["ba", "adzuna", "extension"] as const;
export type JobSource = (typeof JOB_SOURCES)[number];

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  ba: "Bundesagentur für Arbeit",
  adzuna: "Adzuna",
  extension: "Browser extension (LinkedIn, XING, StepStone)",
};

export const LEAD_SOURCES = ["ba", "adzuna", "linkedin", "xing", "stepstone", "indeed", "manual", "email-alert"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "new", "shortlisted", "dismissed", "preparing", "ready", "applying", "submitted", "expired", "failed",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  dismissed: "Dismissed",
  preparing: "Preparing",
  ready: "Ready for review",
  applying: "Applying",
  submitted: "Submitted",
  expired: "Expired",
  failed: "Needs attention",
};

export const OPEN_LEAD_STATUSES: readonly LeadStatus[] = ["new", "shortlisted", "preparing", "ready", "applying", "failed"];

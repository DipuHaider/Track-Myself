export const ISSUE_CATEGORIES = [
  "Bug",
  "Visual glitch",
  "Feature request",
  "Data problem",
  "Accessibility",
  "Other",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_STATUSES = ["open", "triaged", "closed"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  closed: "Closed",
};

export type IssueCounts = Record<IssueStatus | "all", number>;

export const ISSUE_MESSAGE_MAX = 2000;

export const ISSUE_EVENT = "tm-issue-reported";

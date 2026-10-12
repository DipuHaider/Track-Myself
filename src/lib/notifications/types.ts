export const NOTIFICATION_TYPES = [
  "ghost",
  "duplicate",
  "interview",
  "follow-up",
  "todo",
  "issue-update",
  "issue-new",
  "account",
  "ai-key",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TYPE_LABELS: Record<NotificationType, string> = {
  ghost: "Ghost listings",
  duplicate: "Duplicates",
  interview: "Interviews",
  "follow-up": "Follow-ups",
  todo: "To-dos",
  "issue-update": "Issue updates",
  "issue-new": "New reports",
  account: "Account",
  "ai-key": "AI key",
};

export const TYPE_HINTS: Record<NotificationType, string> = {
  ghost: "An application that has gone quiet for 45 days.",
  duplicate: "The same job tracked twice.",
  interview: "Interviews coming up this week.",
  "follow-up": "Reminders you set on an application.",
  todo: "To-dos that are due soon.",
  "issue-update": "Replies and status changes on something you reported.",
  "issue-new": "New reports from users (staff only).",
  account: "Role, plan and account changes.",
  "ai-key": "Problems with your own AI key.",
};

export const USER_NOTIFICATION_TYPES: readonly NotificationType[] = NOTIFICATION_TYPES.filter(
  (t) => t !== "issue-new",
);

export type NotificationItem = {
  id: string;
  kind: "stored" | "derived";
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export const NOTIFICATION_EVENT = "tm-notifications";
export const INTERVIEW_WINDOW_DAYS = 7;
export const SEEN_CAP = 400;

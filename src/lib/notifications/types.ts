export const NOTIFICATION_TYPES = [
  "ghost",
  "duplicate",
  "interview",
  "todo",
  "issue-update",
  "issue-new",
  "account",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

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

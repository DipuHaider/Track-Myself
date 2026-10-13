import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import Todo from "@/models/Todo";
import User from "@/models/User";
import { computeDuplicateIds, isPossibleGhost } from "@/lib/applicationFlags";
import type { Application as AppType } from "@/types/application";
import { INTERVIEW_WINDOW_DAYS, type NotificationItem, type NotificationType } from "@/lib/notifications/types";

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

const TERMINAL_STATUSES: readonly string[] = ["Offer Received", "Rejected"];
const FOLLOW_UP_LEAD_DAYS = 1;
const FOLLOW_UP_GRACE_DAYS = 14;
const DEADLINE_LEAD_DAYS = 2;
const PRE_APPLY_STATUSES: readonly string[] = ["Wishlist", "Not Completed"];

/* Exactly the fields the rules below read. The list used to come down with
   every field including the job description, sixty seconds apart, per tab. */
export const DERIVE_PROJECTION =
  "companyName jobTitle jobPostUrl applicationStatus appliedDate createdAt followUpDate deadline contacts.name";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function whenLabel(days: number) {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export type DeriveInput = {
  apps: AppType[];
  todos: { _id: { toString(): string }; title: string; dueAt: Date }[];
  interviews: {
    _id: { toString(): string };
    applicationId: { toString(): string };
    stageName: string;
    scheduledDate: Date;
    status?: string;
  }[];
  now?: Date;
};

export function appHref(id: string, tab?: string) {
  return `/me/applications?open=${encodeURIComponent(id)}${tab ? `&tab=${tab}` : ""}`;
}

/* Pure: the rules, given the rows. Computed fresh on every read, so an item
   disappears the moment the thing it describes is resolved — no sweeper, and
   nothing can go stale. */
export function deriveItems({ apps, todos, interviews, now = new Date() }: DeriveInput): NotificationItem[] {
  const items: NotificationItem[] = [];
  const duplicates = computeDuplicateIds(apps);
  const byId = new Map(apps.map((a) => [String((a as unknown as { _id: unknown })._id), a]));

  for (const app of apps) {
    const id = String((app as unknown as { _id: { toString(): string } })._id);

    if (isPossibleGhost(app)) {
      items.push({
        id: `ghost:${id}`,
        kind: "derived",
        type: "ghost",
        title: "Possible ghost listing",
        body: `${app.companyName} — ${app.jobTitle} has been quiet for 45+ days.`,
        href: appHref(id),
        createdAt: new Date(app.appliedDate ?? app.createdAt ?? now).toISOString(),
        read: false,
      });
    }

    if (app.followUpDate && !TERMINAL_STATUSES.includes(app.applicationStatus)) {
      const days = daysBetween(startOfDay(now), startOfDay(new Date(app.followUpDate)));
      if (days <= FOLLOW_UP_LEAD_DAYS && days >= -FOLLOW_UP_GRACE_DAYS) {
        const contact = app.contacts?.find((c) => c.name)?.name;
        items.push({
          id: `follow-up:${id}:${new Date(app.followUpDate).toISOString().slice(0, 10)}`,
          kind: "derived",
          type: "follow-up",
          title: days < 0 ? "Follow-up overdue" : `Follow up ${whenLabel(days)}`,
          body: `${app.companyName} — ${app.jobTitle}${contact ? ` (${contact})` : ""}.`,
          href: appHref(id),
          createdAt: new Date(app.followUpDate).toISOString(),
          read: false,
        });
      }
    }

    if (app.deadline && PRE_APPLY_STATUSES.includes(app.applicationStatus)) {
      const days = daysBetween(startOfDay(now), startOfDay(new Date(app.deadline)));
      if (days >= 0 && days <= DEADLINE_LEAD_DAYS) {
        items.push({
          id: `deadline:${id}:${new Date(app.deadline).toISOString().slice(0, 10)}`,
          kind: "derived",
          type: "deadline",
          title: `Deadline ${whenLabel(days)}`,
          body: `${app.companyName} — ${app.jobTitle} closes ${whenLabel(days)} and is not submitted yet.`,
          href: appHref(id),
          createdAt: new Date(now.getTime() - (DEADLINE_LEAD_DAYS - days) * 3_600_000).toISOString(),
          read: false,
        });
      }
    }

    if (duplicates.has(id)) {
      items.push({
        id: `dupe:${id}`,
        kind: "derived",
        type: "duplicate",
        title: "Duplicate application",
        body: `You have applied to ${app.companyName} — ${app.jobTitle} more than once.`,
        href: appHref(id),
        createdAt: new Date(app.appliedDate ?? app.createdAt ?? now).toISOString(),
        read: false,
      });
    }
  }

  const horizon = now.getTime() + INTERVIEW_WINDOW_DAYS * 86_400_000;
  for (const iv of interviews) {
    const at = new Date(iv.scheduledDate).getTime();
    if (iv.status && iv.status !== "Scheduled") continue;
    if (Number.isNaN(at) || at < now.getTime() || at > horizon) continue;
    const appId = String(iv.applicationId);
    const app = byId.get(appId);
    const days = daysBetween(now, new Date(iv.scheduledDate));
    items.push({
      id: `interview:${iv._id.toString()}`,
      kind: "derived",
      type: "interview",
      title: `Interview ${whenLabel(days)}`,
      body: `${iv.stageName} with ${app?.companyName ?? "an application"} on ${new Date(iv.scheduledDate).toLocaleDateString()}.`,
      href: appHref(appId, "interviews"),
      createdAt: new Date(iv.scheduledDate).toISOString(),
      read: false,
    });
  }

  for (const todo of todos) {
    const days = daysBetween(now, new Date(todo.dueAt));
    if (days > 2) continue;
    items.push({
      id: `todo:${todo._id.toString()}`,
      kind: "derived",
      type: "todo",
      title: days < 0 ? "To-do overdue" : `To-do due ${whenLabel(days)}`,
      body: todo.title,
      href: "/me/todos",
      createdAt: new Date(todo.dueAt).toISOString(),
      read: false,
    });
  }

  return items;
}

export type NotificationPrefs = Partial<Record<NotificationType, boolean>>;

export function isMuted(prefs: NotificationPrefs | null | undefined, type: NotificationType): boolean {
  return prefs?.[type] === false;
}

export async function loadNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const row = (await User.findById(userId, "notifPrefs").lean()) as
    | { notifPrefs?: Map<string, boolean> | Record<string, boolean> }
    | null;
  const raw = row?.notifPrefs;
  if (!raw) return {};
  return (raw instanceof Map ? Object.fromEntries(raw) : raw) as NotificationPrefs;
}

export async function deriveNotifications(userId: string): Promise<NotificationItem[]> {
  await dbConnect();

  const [apps, todos] = await Promise.all([
    Application.find({ userId }, DERIVE_PROJECTION).lean() as unknown as Promise<AppType[]>,
    Todo.find({ userId, done: false, dueAt: { $ne: null } }, "title dueAt").lean() as Promise<DeriveInput["todos"]>,
  ]);

  const now = new Date();
  const appIds = apps.map((a) => (a as unknown as { _id: unknown })._id);
  const interviews = appIds.length
    ? ((await Interview.find(
        {
          applicationId: { $in: appIds },
          status: "Scheduled",
          scheduledDate: { $gte: now, $lte: new Date(now.getTime() + INTERVIEW_WINDOW_DAYS * 86_400_000) },
        },
        "applicationId stageName scheduledDate status",
      ).lean()) as unknown as DeriveInput["interviews"])
    : [];

  return deriveItems({ apps, todos, interviews, now });
}

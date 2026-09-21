import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import Todo from "@/models/Todo";
import { computeDuplicateIds, isPossibleGhost } from "@/lib/applicationFlags";
import type { Application as AppType } from "@/types/application";
import { INTERVIEW_WINDOW_DAYS, type NotificationItem } from "@/lib/notifications/types";

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function whenLabel(days: number) {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/* Computed fresh on every read, so an item disappears the moment the thing it
   describes is resolved — no sweeper, and nothing can go stale. */
export async function deriveNotifications(userId: string): Promise<NotificationItem[]> {
  await dbConnect();

  const [apps, todos] = await Promise.all([
    Application.find({ userId }).lean() as Promise<AppType[]>,
    Todo.find({ userId, done: false, dueAt: { $ne: null } }).lean() as Promise<
      { _id: { toString(): string }; title: string; dueAt: Date }[]
    >,
  ]);

  const items: NotificationItem[] = [];
  const now = new Date();

  const duplicates = computeDuplicateIds(apps);

  for (const app of apps) {
    const id = String((app as unknown as { _id: { toString(): string } })._id);

    if (isPossibleGhost(app)) {
      items.push({
        id: `ghost:${id}`,
        kind: "derived",
        type: "ghost",
        title: "Possible ghost listing",
        body: `${app.companyName} — ${app.jobTitle} has been quiet for 45+ days.`,
        href: "/me/applications",
        createdAt: new Date(app.appliedDate ?? now).toISOString(),
        read: false,
      });
    }

    if (duplicates.has(id)) {
      items.push({
        id: `dupe:${id}`,
        kind: "derived",
        type: "duplicate",
        title: "Duplicate application",
        body: `You have applied to ${app.companyName} — ${app.jobTitle} more than once.`,
        href: "/me/applications",
        createdAt: new Date(app.appliedDate ?? now).toISOString(),
        read: false,
      });
    }
  }

  const appIds = apps.map((a) => (a as unknown as { _id: unknown })._id);
  if (appIds.length) {
    const horizon = new Date(now.getTime() + INTERVIEW_WINDOW_DAYS * 86_400_000);
    const interviews = (await Interview.find({
      applicationId: { $in: appIds },
      status: "Scheduled",
      scheduledDate: { $gte: now, $lte: horizon },
    })
      .populate("applicationId", "company jobTitle")
      .lean()) as {
      _id: { toString(): string };
      stageName: string;
      scheduledDate: Date;
      applicationId?: { company?: string; jobTitle?: string } | null;
    }[];

    for (const iv of interviews) {
      const days = daysBetween(now, new Date(iv.scheduledDate));
      const who = iv.applicationId?.company ?? "an application";
      items.push({
        id: `interview:${iv._id.toString()}`,
        kind: "derived",
        type: "interview",
        title: `Interview ${whenLabel(days)}`,
        body: `${iv.stageName} with ${who} on ${new Date(iv.scheduledDate).toLocaleDateString()}.`,
        href: "/me/applications",
        createdAt: new Date(iv.scheduledDate).toISOString(),
        read: false,
      });
    }
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

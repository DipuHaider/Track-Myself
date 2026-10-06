import Application from "@/models/Application";
import Interview from "@/models/Interview";
import Reminder from "@/models/Reminder";
import type { HistoryActor } from "@/lib/applicationHistory";

export const TRASH_DAYS = 30;

export const SOFT_DELETE_FIELDS = ["deletedAt", "deletedBy", "deletedByName"] as const;

const DAY_MS = 86_400_000;

export function purgeDate(deletedAt: Date | string): Date {
  return new Date(new Date(deletedAt).getTime() + TRASH_DAYS * DAY_MS);
}

export async function softDeleteApplication(filter: Record<string, unknown>, actor: HistoryActor) {
  return Application.findOneAndUpdate(
    { ...filter, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: actor.id, deletedByName: actor.name } },
    { new: true },
  );
}

export async function restoreApplication(filter: Record<string, unknown>) {
  return Application.findOneAndUpdate(
    { ...filter, deletedAt: { $ne: null } },
    { $set: { deletedAt: null }, $unset: { deletedBy: 1, deletedByName: 1 } },
    { new: true },
  );
}

export async function deleteApplicationsForever(filter: Record<string, unknown>): Promise<number> {
  const rows = await Application.find({ deletedAt: { $ne: null }, ...filter }, "_id").lean();
  const ids = rows.map((r) => r._id);
  if (!ids.length) return 0;
  await Promise.all([
    Interview.deleteMany({ applicationId: { $in: ids } }),
    Reminder.deleteMany({ applicationId: { $in: ids } }),
    Application.deleteMany({ _id: { $in: ids } }),
  ]);
  return ids.length;
}

export async function purgeExpiredApplications(filter: Record<string, unknown> = {}) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * DAY_MS);
  return deleteApplicationsForever({ ...filter, deletedAt: { $ne: null, $lt: cutoff } });
}

export async function listDeletedApplications(filter: Record<string, unknown> = {}) {
  await purgeExpiredApplications(filter);
  const rows = (await Application.find(
    { ...filter, deletedAt: { $ne: null } },
    "userId companyName jobTitle applicationStatus deletedAt deletedBy deletedByName",
  )
    .sort({ deletedAt: -1 })
    .lean()) as unknown as {
    _id: unknown; userId: unknown; companyName: string; jobTitle: string; applicationStatus: string;
    deletedAt: Date; deletedBy?: unknown; deletedByName?: string;
  }[];

  return rows.map((r) => ({
    _id: String(r._id),
    userId: String(r.userId),
    companyName: r.companyName,
    jobTitle: r.jobTitle,
    applicationStatus: r.applicationStatus,
    deletedAt: r.deletedAt,
    deletedBy: r.deletedBy ? String(r.deletedBy) : null,
    deletedByName: r.deletedByName ?? "",
    purgeAt: purgeDate(r.deletedAt),
  }));
}

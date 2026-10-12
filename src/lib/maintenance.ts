import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import Application from "@/models/Application";
import PasswordResetToken from "@/models/PasswordResetToken";
import EmailVerificationToken from "@/models/EmailVerificationToken";
import { purgeExpiredApplications } from "@/lib/applicationTrash";
import { sweepOrphans } from "@/lib/ai/budget";
import { retryPendingDeletions } from "@/lib/accountDeletion";
import { recordAdminAction } from "@/lib/audit";
import { attachmentIdFromUrl } from "@/lib/attachments";

export type MaintenanceSummary = {
  startedAt: string;
  ms: number;
  purgedApplications: number;
  aiOrphans: number;
  usedTokens: number;
  orphanAttachments: number;
  deletions: { retried: number; completed: number };
  errors: string[];
};

const USED_TOKEN_DAYS = 7;
const ORPHAN_ATTACHMENT_DAYS = 7;
const ORPHAN_BATCH = 200;

async function step<T>(name: string, errors: string[], run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    errors.push(`${name}: ${err instanceof Error ? err.message : "failed"}`);
    return fallback;
  }
}

/* Attachments uploaded but never attached to a saved application (the form
   was abandoned) sit unreferenced. After a week they are removed unless some
   application still lists them, which the backfill migration normally links. */
async function removeOrphanAttachments(): Promise<number> {
  const cutoff = new Date(Date.now() - ORPHAN_ATTACHMENT_DAYS * 86_400_000);
  const candidates = (await Document.find(
    { applicationId: null, createdAt: { $lt: cutoff } },
    "_id userId name",
  ).limit(ORPHAN_BATCH).lean()) as { _id: unknown; userId: unknown; name: string }[];
  if (!candidates.length) return 0;

  const owners = [...new Set(candidates.map((c) => String(c.userId)))];
  const apps = (await Application.find({ userId: { $in: owners }, "attachments.0": { $exists: true } }, "attachments")
    .setOptions({ withDeleted: true })
    .lean()) as { attachments?: string[] }[];
  const referenced = new Set(
    apps.flatMap((a) => (a.attachments ?? []).map(attachmentIdFromUrl)).filter(Boolean),
  );

  const removable = candidates.filter((c) => !referenced.has(String(c._id))).map((c) => c._id);
  if (!removable.length) return 0;
  const res = await Document.deleteMany({ _id: { $in: removable } });
  return res.deletedCount ?? 0;
}

export async function runMaintenance(trigger: "cron" | "manual", actor?: { id?: string | null; email?: string | null }): Promise<MaintenanceSummary> {
  const startedAt = new Date();
  const errors: string[] = [];
  await dbConnect();

  const usedCutoff = new Date(Date.now() - USED_TOKEN_DAYS * 86_400_000);

  const purgedApplications = await step("purge", errors, () => purgeExpiredApplications(), 0);
  const aiOrphans = await step("ai-sweep", errors, () => sweepOrphans(120_000, 200), 0);
  const usedTokens = await step("tokens", errors, async () => {
    const [a, b] = await Promise.all([
      PasswordResetToken.deleteMany({ usedAt: { $ne: null, $lt: usedCutoff } }),
      EmailVerificationToken.deleteMany({ usedAt: { $ne: null, $lt: usedCutoff } }),
    ]);
    return (a.deletedCount ?? 0) + (b.deletedCount ?? 0);
  }, 0);
  const orphanAttachments = await step("attachments", errors, removeOrphanAttachments, 0);
  const deletions = await step("deletions", errors, () => retryPendingDeletions(), { retried: 0, completed: 0 });

  const summary: MaintenanceSummary = {
    startedAt: startedAt.toISOString(),
    ms: Date.now() - startedAt.getTime(),
    purgedApplications,
    aiOrphans,
    usedTokens,
    orphanAttachments,
    deletions,
    errors,
  };

  await recordAdminAction({
    actor: actor ?? null,
    action: "maintenance.run",
    targetType: "system",
    targetLabel: trigger,
    after: summary as unknown as Record<string, unknown>,
  });

  return summary;
}

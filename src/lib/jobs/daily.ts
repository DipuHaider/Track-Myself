import { canUseJobHunt, type Role } from "@/lib/permissions";
import { getAppSettings } from "@/lib/appSettings";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { jobHuntEnabledUserIds, runHuntForUser, type HuntSummary } from "@/lib/jobs/hunt";
import { autoPrepareForUser } from "@/lib/jobs/autoPrepare";
import { normaliseJobHunt } from "@/lib/jobs/settings";
import { closeMissedDeadlines, createFollowUpTodos, deliverDailyReport } from "@/lib/jobs/upkeep";

export type DailyUserResult = {
  userId: string;
  hunt?: HuntSummary;
  autoPrepared?: { prepared: string[]; failed: string[]; skipped: number };
  upkeep?: { followUpTodos: number; missedDeadlines: number };
  report?: { emailed: boolean; notified: boolean; webhook: boolean };
  error?: string;
  skipped?: string;
};
export type DailySummary = { startedAt: string; users: DailyUserResult[]; leftOver: number };

const BUDGET_MS = 50_000;

/* Seconds held back from auto-prepare so upkeep and the report always run. */
const REPORT_RESERVE_MS = 12_000;

/* One pass over every account with job hunt switched on, inside the time a
   single Vercel invocation allows. Accounts that do not fit are reported as
   left over and get their turn on the next run or from "Refresh now". */
export async function runDailyJobHunt(now = new Date()): Promise<DailySummary> {
  const startedAt = Date.now();
  const deadline = startedAt + BUDGET_MS;
  const ids = await jobHuntEnabledUserIds();
  const settings = await getAppSettings();
  await dbConnect();

  const users: DailyUserResult[] = [];
  let processed = 0;
  for (const userId of ids) {
    if (Date.now() > deadline - REPORT_RESERVE_MS) break;
    processed++;
    try {
      const u = (await User.findById(userId, "role plan status email jobHunt").lean()) as
        { role: Role; plan: string; status?: string; email?: string; jobHunt?: unknown } | null;
      if (!u || !canUseJobHunt(u.role, u.plan, settings.features.jobHunt)) {
        users.push({ userId, skipped: "not-entitled" });
        continue;
      }
      const remaining = deadline - Date.now();
      const hunt = await runHuntForUser(userId, { now, deadlineAt: Date.now() + Math.max(5_000, Math.min(remaining - REPORT_RESERVE_MS, 35_000)) });
      const settingsForUser = normaliseJobHunt(u.jobHunt);
      const autoPrepared = await autoPrepareForUser(
        { id: userId, role: u.role, plan: u.plan === "premium" ? "premium" : "free", status: u.status === "paused" ? "paused" : "active", email: u.email },
        settingsForUser,
        deadline - REPORT_RESERVE_MS,
      );
      const missedDeadlines = await closeMissedDeadlines(userId, now);
      const delivered = await deliverDailyReport(userId, now);
      const followUpTodos = delivered.report ? await createFollowUpTodos(userId, delivered.report.followUps, now) : 0;
      users.push({
        userId,
        hunt,
        autoPrepared,
        upkeep: { followUpTodos, missedDeadlines },
        report: { emailed: delivered.emailed, notified: delivered.notified, webhook: delivered.webhook },
      });
    } catch (err) {
      users.push({ userId, error: err instanceof Error ? err.message : "failed" });
    }
  }

  return { startedAt: new Date(startedAt).toISOString(), users, leftOver: ids.length - processed };
}

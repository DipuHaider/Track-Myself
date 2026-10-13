import { canUseJobHunt, type Role } from "@/lib/permissions";
import { getAppSettings } from "@/lib/appSettings";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { jobHuntEnabledUserIds, runHuntForUser, type HuntSummary } from "@/lib/jobs/hunt";

export type DailyUserResult = { userId: string; hunt?: HuntSummary; error?: string; skipped?: string };
export type DailySummary = { startedAt: string; users: DailyUserResult[]; leftOver: number };

const BUDGET_MS = 50_000;

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
    if (Date.now() > deadline - 5_000) break;
    processed++;
    try {
      const u = (await User.findById(userId, "role plan").lean()) as { role: Role; plan: string } | null;
      if (!u || !canUseJobHunt(u.role, u.plan, settings.features.jobHunt)) {
        users.push({ userId, skipped: "not-entitled" });
        continue;
      }
      const remaining = deadline - Date.now();
      const hunt = await runHuntForUser(userId, { now, deadlineAt: Date.now() + Math.min(remaining, 40_000) });
      users.push({ userId, hunt });
    } catch (err) {
      users.push({ userId, error: err instanceof Error ? err.message : "failed" });
    }
  }

  return { startedAt: new Date(startedAt).toISOString(), users, leftOver: ids.length - processed };
}

import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";
import { TARGET_PLATFORMS, targetPlatformFor, type JobHuntSettings, type TargetPlatform } from "@/lib/jobs/settings";
import { leadSummary, type LeadSummary } from "@/lib/jobs/leads";
import { prepareLead, type PrepareUser } from "@/lib/jobs/prepare";

export type Candidate = { _id: string; platform: string; fitScore: number | null };

/* Per platform, prepare only what today's target still needs: the target
   minus what is already submitted or waiting for review, capped at the
   account's auto-prepare number and floored by its minimum fit. */
export function pickForAutoPrepare(candidates: Candidate[], settings: JobHuntSettings, summary: LeadSummary): string[] {
  if (settings.autoPrepareTop <= 0) return [];
  const room = Object.fromEntries(
    TARGET_PLATFORMS.map((p) => {
      const s = summary.platforms[p];
      return [p, Math.max(0, Math.min(settings.autoPrepareTop, s.target - s.submitted - s.ready))];
    }),
  ) as Record<TargetPlatform, number>;

  const picked: string[] = [];
  const sorted = [...candidates]
    .filter((c) => (c.fitScore ?? 0) >= settings.minFitForAutoPrepare)
    .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
  for (const c of sorted) {
    const p = targetPlatformFor(c.platform);
    if (room[p] > 0) {
      room[p]--;
      picked.push(c._id);
    }
  }
  return picked;
}

export async function autoPrepareForUser(
  user: PrepareUser,
  settings: JobHuntSettings,
  deadlineAt: number,
): Promise<{ prepared: string[]; failed: string[]; skipped: number }> {
  const out = { prepared: [] as string[], failed: [] as string[], skipped: 0 };
  if (settings.autoPrepareTop <= 0 || user.status === "paused") return out;
  await dbConnect();
  const summary = await leadSummary(user.id, settings);
  const rows = (await JobLead.find({ userId: user.id, status: "new" }, "platform fitScore").lean()) as
    { _id: { toString(): string }; platform?: string; fitScore?: number | null }[];
  const ids = pickForAutoPrepare(
    rows.map((r) => ({ _id: r._id.toString(), platform: r.platform ?? "", fitScore: r.fitScore ?? null })),
    settings,
    summary,
  );
  for (const id of ids) {
    if (Date.now() > deadlineAt - 8_000) {
      out.skipped++;
      continue;
    }
    const res = await prepareLead(id, user);
    if (res.ok) out.prepared.push(id);
    else out.failed.push(id);
  }
  return out;
}

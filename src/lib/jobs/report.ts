import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import JobLead from "@/models/JobLead";
import User from "@/models/User";
import { ruleSuggestions, shortlist, type InterviewLite, type TriageRow } from "@/lib/ai/triage";
import { aiEntitlement, runAiJsonTask, type Actor } from "@/lib/ai/gateway";
import { getUserCredential } from "@/lib/ai/userKey";
import { reportAdviceSchema } from "@/lib/ai/schemas";
import { fence, SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { toInsightRow, type InsightRow } from "@/lib/jobs/insights";
import { normaliseJobHunt, TARGET_PLATFORMS, targetPlatformFor, type JobHuntSettings, type TargetPlatform } from "@/lib/jobs/settings";
import { startOfLocalDay } from "@/lib/jobs/leads";
import type { Application as AppType } from "@/types/application";
import type { Role } from "@/lib/permissions";

const DAY = 86_400_000;
const FEEDBACK_DAYS = 30;
const MIN_SAMPLE = 5;

export type ReportLead = {
  id: string;
  company: string;
  title: string;
  platform: string;
  fitScore: number | null;
  deadline: string | null;
  status: string;
};

export type PlatformFeedback = { platform: string; applied: number; responded: number; interviewed: number; responseRate: number };

export type DailyReport = {
  date: string;
  generatedAt: string;
  targets: Record<TargetPlatform, { target: number; submittedToday: number; submittedYesterday: number }>;
  newLeads: { total: number; byPlatform: Record<TargetPlatform, number>; top: ReportLead[] };
  waiting: { ready: ReportLead[]; applying: ReportLead[]; shortlisted: number; failed: ReportLead[] };
  submittedYesterday: ReportLead[];
  deadlines: ReportLead[];
  expiredYesterday: number;
  followUps: TriageRow[];
  feedback: {
    windowDays: number;
    byPlatform: PlatformFeedback[];
    fitBands: { band: string; applied: number; responseRate: number }[];
    medianDaysToResponse: number | null;
    weekTargetHitRate: number | null;
  };
  suggestions: string[];
  suggestionsMode: "rules" | "ai";
  summary: string[];
};

type LeadRow = {
  _id: { toString(): string };
  company: string;
  title: string;
  platform?: string;
  fitScore?: number | null;
  deadline?: Date | null;
  status: string;
  firstSeenAt?: Date;
  submittedAt?: Date | null;
  statusChangedAt?: Date;
};

const toReportLead = (l: LeadRow): ReportLead => ({
  id: l._id.toString(),
  company: l.company,
  title: l.title,
  platform: l.platform ?? "Other",
  fitScore: l.fitScore ?? null,
  deadline: l.deadline ? new Date(l.deadline).toISOString() : null,
  status: l.status,
});

const rate = (n: number, d: number) => (d ? Math.round((n / d) * 100) / 100 : 0);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function feedbackFrom(rows: InsightRow[], since: Date): DailyReport["feedback"] & { applied: InsightRow[] } {
  const applied = rows.filter((r) => r.appliedAt && new Date(r.appliedAt) >= since);
  const byPlatformMap = new Map<string, PlatformFeedback>();
  for (const r of applied) {
    const p = byPlatformMap.get(r.platform) ?? { platform: r.platform, applied: 0, responded: 0, interviewed: 0, responseRate: 0 };
    p.applied++;
    if (r.responded) p.responded++;
    if (r.interviewed) p.interviewed++;
    byPlatformMap.set(r.platform, p);
  }
  const byPlatform = [...byPlatformMap.values()]
    .map((p) => ({ ...p, responseRate: rate(p.responded, p.applied) }))
    .sort((a, b) => b.applied - a.applied);

  const bands: [string, number, number][] = [["under 40", 0, 40], ["40–64", 40, 65], ["65 and up", 65, 101]];
  const fitBands = bands
    .map(([band, lo, hi]) => {
      const inBand = applied.filter((r) => r.fitScore != null && r.fitScore >= lo && r.fitScore < hi);
      return { band, applied: inBand.length, responseRate: rate(inBand.filter((r) => r.responded).length, inBand.length) };
    })
    .filter((b) => b.applied > 0);

  return {
    windowDays: FEEDBACK_DAYS,
    byPlatform,
    fitBands,
    medianDaysToResponse: median(applied.map((r) => r.daysToFirstResponse).filter((d): d is number => d != null)),
    weekTargetHitRate: null,
    applied,
  };
}

/* Plain rules over the owner's own numbers, phrased as suggestions. Each
   needs a minimum sample, because "StepStone never replies" after two
   applications is noise presented as insight. */
export function ruleAdvice(input: {
  feedback: DailyReport["feedback"];
  waitingReady: number;
  settings: JobHuntSettings;
}): string[] {
  const out: string[] = [];
  const { feedback, settings } = input;
  const solid = feedback.byPlatform.filter((p) => p.applied >= MIN_SAMPLE);
  if (solid.length >= 2) {
    const best = [...solid].sort((a, b) => b.responseRate - a.responseRate)[0];
    const worst = [...solid].sort((a, b) => a.responseRate - b.responseRate)[0];
    if (best.platform !== worst.platform && best.responseRate >= Math.max(0.1, worst.responseRate * 2)) {
      const times = worst.responseRate ? `${Math.round(best.responseRate / worst.responseRate)}×` : "far more";
      out.push(`${best.platform} answers ${times} as often as ${worst.platform} for you (${Math.round(best.responseRate * 100)}% vs ${Math.round(worst.responseRate * 100)}%). Consider moving some of your daily target to ${best.platform}.`);
    }
  }
  const low = feedback.fitBands.find((b) => b.band === "under 40");
  const high = feedback.fitBands.find((b) => b.band === "65 and up");
  if (low && low.applied >= MIN_SAMPLE && low.responseRate === 0) {
    out.push(`None of your ${low.applied} applications under 40% fit got a reply. Raise the auto-prepare minimum fit to 50 or skip those jobs.`);
  } else if (low && high && high.applied >= MIN_SAMPLE && low.applied >= MIN_SAMPLE && high.responseRate > low.responseRate * 2) {
    out.push(`High-fit applications get replies ${Math.round(high.responseRate * 100)}% of the time against ${Math.round(low.responseRate * 100)}% for low-fit ones. Spend your time on the top of the inbox.`);
  }
  if (feedback.medianDaysToResponse != null) {
    const followUp = Math.max(5, Math.round(feedback.medianDaysToResponse * 1.5));
    out.push(`Companies that answer you take about ${feedback.medianDaysToResponse} days. A follow-up after ${followUp} days is reasonable.`);
  }
  if (feedback.weekTargetHitRate != null && feedback.weekTargetHitRate < 0.5) {
    out.push(`You reached ${Math.round(feedback.weekTargetHitRate * 100)}% of your daily targets this week. Lower the targets or turn on auto-prepare so applications are ready each morning.`);
  }
  if (input.waitingReady >= 3) {
    out.push(`${input.waitingReady} prepared applications are waiting for your review. Clearing them is the fastest way to hit today's target.`);
  }
  if (!out.length && settings.enabled) {
    out.push("Not enough history yet for trends. Keep applying through the inbox and this section fills in within a couple of weeks.");
  }
  return out.slice(0, 5);
}

export function computeReport(input: {
  now: Date;
  settings: JobHuntSettings;
  leads: LeadRow[];
  insightRows: InsightRow[];
  followUps: TriageRow[];
}): DailyReport {
  const { now, settings } = input;
  const today = startOfLocalDay(now);
  const yesterday = new Date(today.getTime() - DAY);
  const soon = new Date(today.getTime() + 4 * DAY);
  const weekAgo = new Date(today.getTime() - 7 * DAY);

  const targets = Object.fromEntries(
    TARGET_PLATFORMS.map((p) => [p, { target: settings.dailyTargets[p], submittedToday: 0, submittedYesterday: 0 }]),
  ) as DailyReport["targets"];
  const byPlatform = Object.fromEntries(TARGET_PLATFORMS.map((p) => [p, 0])) as Record<TargetPlatform, number>;

  const fresh: LeadRow[] = [];
  const ready: LeadRow[] = [];
  const applying: LeadRow[] = [];
  const failed: LeadRow[] = [];
  const submittedYesterday: LeadRow[] = [];
  const deadlines: LeadRow[] = [];
  let shortlisted = 0;
  let expiredYesterday = 0;
  let submittedWeek = 0;

  for (const l of input.leads) {
    const bucket = targetPlatformFor(l.platform);
    if (l.firstSeenAt && l.firstSeenAt >= yesterday && l.status === "new") {
      fresh.push(l);
      byPlatform[bucket]++;
    }
    if (l.status === "ready") ready.push(l);
    if (l.status === "applying") applying.push(l);
    if (l.status === "failed") failed.push(l);
    if (l.status === "shortlisted") shortlisted++;
    if (l.status === "expired" && l.statusChangedAt && l.statusChangedAt >= yesterday) expiredYesterday++;
    if (l.status === "submitted" && l.submittedAt) {
      if (l.submittedAt >= today) targets[bucket].submittedToday++;
      else if (l.submittedAt >= yesterday) {
        targets[bucket].submittedYesterday++;
        submittedYesterday.push(l);
      }
      if (l.submittedAt >= weekAgo && l.submittedAt < today) submittedWeek++;
    }
    if (["new", "shortlisted", "ready", "applying"].includes(l.status) && l.deadline && l.deadline >= today && l.deadline < soon) {
      deadlines.push(l);
    }
  }

  const totalTarget = TARGET_PLATFORMS.reduce((s, p) => s + settings.dailyTargets[p], 0);
  const fb = feedbackFrom(input.insightRows, new Date(today.getTime() - FEEDBACK_DAYS * DAY));
  const { applied: _applied, ...feedback } = fb;
  void _applied;
  /* Judging a week needs a week: a fresh account with nothing submitted yet
     would otherwise be told on day one that it missed its targets. */
  const runningForDays = input.leads.reduce((oldest, l) => Math.max(oldest, l.firstSeenAt ? (today.getTime() - l.firstSeenAt.getTime()) / DAY : 0), 0);
  const days = Math.min(7, Math.floor(runningForDays));
  feedback.weekTargetHitRate = totalTarget && days >= 3 ? Math.min(1, rate(submittedWeek, totalTarget * days)) : null;

  const byFit = (a: LeadRow, b: LeadRow) => (b.fitScore ?? 0) - (a.fitScore ?? 0);
  const suggestions = ruleAdvice({ feedback, waitingReady: ready.length, settings });

  const summary: string[] = [];
  summary.push(`${fresh.length} new job${fresh.length === 1 ? "" : "s"} since yesterday.`);
  if (ready.length) summary.push(`${ready.length} application${ready.length === 1 ? " is" : "s are"} ready for your review.`);
  const ySubmitted = submittedYesterday.length;
  const yTarget = totalTarget;
  summary.push(`Yesterday you applied to ${ySubmitted}${yTarget ? ` of ${yTarget}` : ""}.`);
  if (deadlines.length) summary.push(`${deadlines.length} open job${deadlines.length === 1 ? " closes" : "s close"} in the next three days.`);
  if (input.followUps.length) summary.push(`${input.followUps.length} tracked application${input.followUps.length === 1 ? " needs" : "s need"} attention.`);

  return {
    date: today.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    targets,
    newLeads: { total: fresh.length, byPlatform, top: [...fresh].sort(byFit).slice(0, 8).map(toReportLead) },
    waiting: {
      ready: [...ready].sort(byFit).slice(0, 10).map(toReportLead),
      applying: applying.slice(0, 10).map(toReportLead),
      shortlisted,
      failed: failed.slice(0, 5).map(toReportLead),
    },
    submittedYesterday: submittedYesterday.map(toReportLead),
    deadlines: deadlines.sort((a, b) => (a.deadline!.getTime() - b.deadline!.getTime())).slice(0, 10).map(toReportLead),
    expiredYesterday,
    followUps: input.followUps.slice(0, 6),
    feedback,
    suggestions,
    suggestionsMode: "rules",
    summary,
  };
}

/* Rewrites the rule-based advice in plainer words, only for accounts using
   their own key or Premium: a daily call is not worth a free user's monthly
   allowance. The model sees counts and rates, never CV or posting text. */
async function polishAdvice(report: DailyReport, actor: Actor): Promise<DailyReport> {
  if (actor.kind !== "user" || !report.suggestions.length) return report;
  const userKey = await getUserCredential(actor.id);
  const ent = await aiEntitlement(actor, "jobs.report", userKey);
  if (!ent.allowed || ent.via === "allowance") return report;
  const facts = {
    suggestions: report.suggestions,
    feedback: report.feedback,
    today: { newJobs: report.newLeads.total, ready: report.waiting.ready.length, deadlines: report.deadlines.length },
  };
  const run = await runAiJsonTask({
    task: "jobs.report",
    actor,
    userKey,
    system: SYSTEM_PROMPT,
    prompt: `Rewrite these job-search suggestions for the candidate as at most five short, concrete, encouraging sentences in English. Use only the numbers given; do not invent facts or advice that the data does not support.\n\n${fence("facts", JSON.stringify(facts))}\n\nReturn a JSON array of strings.`,
    maxOutputTokens: 600,
    schema: reportAdviceSchema,
    kind: "array",
    schemaHint: "[string, ...]",
  });
  if (!run.ok) return report;
  return { ...report, suggestions: run.value, suggestionsMode: "ai" };
}

export async function buildDailyReport(userId: string, opts: { now?: Date; polish?: boolean } = {}): Promise<DailyReport | null> {
  const now = opts.now ?? new Date();
  await dbConnect();
  const user = (await User.findById(userId, "role plan status jobHunt").lean()) as
    | { role: Role; plan?: string; status?: string; jobHunt?: unknown }
    | null;
  if (!user) return null;
  const settings = normaliseJobHunt(user.jobHunt);
  const today = startOfLocalDay(now);
  const since = new Date(today.getTime() - 40 * DAY);

  const [leads, apps] = await Promise.all([
    JobLead.find(
      {
        userId,
        $or: [
          { status: { $in: ["new", "shortlisted", "ready", "applying", "failed"] } },
          { submittedAt: { $gte: new Date(today.getTime() - 8 * DAY) } },
          { status: "expired", statusChangedAt: { $gte: new Date(today.getTime() - DAY) } },
        ],
      },
      "company title platform fitScore deadline status firstSeenAt submittedAt statusChangedAt",
    ).lean() as Promise<LeadRow[]>,
    Application.find(
      { userId, updatedAt: { $gte: since } },
      "companyName jobTitle platform applicationStatus createdAt appliedDate followUpDate postedAt postingPrecision deadline submissionMethod leadId statusHistory",
    ).limit(500).lean() as Promise<(AppType & { _id: { toString(): string }; leadId?: { toString(): string } | null })[]>,
  ]);

  const appIds = apps.map((a) => a._id);
  const [interviews, leadFits] = await Promise.all([
    Interview.find({ applicationId: { $in: appIds } }, "applicationId scheduledDate status").lean() as Promise<(InterviewLite & { applicationId: { toString(): string } })[]>,
    JobLead.find({ _id: { $in: apps.map((a) => a.leadId).filter(Boolean) } }, "fitScore source").lean() as Promise<{ _id: { toString(): string }; fitScore?: number | null; source?: string }[]>,
  ]);
  const fitById = new Map(leadFits.map((l) => [l._id.toString(), l]));
  const rounds = new Map<string, number>();
  for (const iv of interviews) rounds.set(String(iv.applicationId), (rounds.get(String(iv.applicationId)) ?? 0) + 1);

  const insightRows = apps.map((a) => toInsightRow(
    a as unknown as Parameters<typeof toInsightRow>[0],
    a.leadId ? fitById.get(a.leadId.toString()) : undefined,
    rounds.get(a._id.toString()) ?? 0,
  ));
  const followUps = ruleSuggestions(
    shortlist(apps as unknown as AppType[], interviews.map((iv) => ({ ...iv, applicationId: String(iv.applicationId) }))),
  ).rows;

  const report = computeReport({ now, settings, leads, insightRows, followUps });
  if (!opts.polish) return report;
  const actor: Actor = {
    kind: "user", id: userId, role: user.role, plan: user.plan === "premium" ? "premium" : "free",
    status: user.status === "paused" ? "paused" : "active",
  };
  return polishAdvice(report, actor);
}

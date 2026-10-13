import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import JobLead from "@/models/JobLead";
import Application from "@/models/Application";
import User from "@/models/User";
import { notify } from "@/lib/notifications/create";
import { loadNotificationPrefs, isMuted } from "@/lib/notifications/derive";
import { sendJobHuntReportMail } from "@/lib/mail";
import { SITE_URL } from "@/lib/seo";
import { sendWebhook } from "@/lib/jobs/webhooks";
import { buildDailyReport, type DailyReport } from "@/lib/jobs/report";
import { normaliseJobHunt } from "@/lib/jobs/settings";
import type { TriageRow } from "@/lib/ai/triage";

const DAY = 86_400_000;
const FOLLOW_UP_PREFIX = "Follow up: ";

export function followUpTitle(row: Pick<TriageRow, "company" | "jobTitle">): string {
  return `${FOLLOW_UP_PREFIX}${row.company} — ${row.jobTitle}`.slice(0, 300);
}

/* One open to-do per application whose follow-up date has passed. The title
   is the key, so a second run, or a to-do the owner already made by hand
   with the same wording, never produces a duplicate. */
export async function createFollowUpTodos(userId: string, rows: TriageRow[], now = new Date()): Promise<number> {
  const due = rows.filter((r) => r.reasons.includes("follow-up-due"));
  if (!due.length) return 0;
  await dbConnect();
  const titles = due.map(followUpTitle);
  const existing = new Set(
    ((await Todo.find({ userId, title: { $in: titles } }, "title").lean()) as { title: string }[]).map((t) => t.title),
  );
  const fresh = titles.filter((t) => !existing.has(t));
  if (!fresh.length) return 0;
  await Todo.insertMany(fresh.map((title, i) => ({ userId, title, dueAt: now, order: -1 - i })));
  return fresh.length;
}

/* A prepared application whose posting deadline has passed cannot be sent
   any more. The lead expires and the tracked application gets a dated note,
   so it is clear why it never moved past Wishlist. */
export async function closeMissedDeadlines(userId: string, now = new Date()): Promise<number> {
  await dbConnect();
  const missed = (await JobLead.find(
    { userId, status: { $in: ["ready", "applying"] }, deadline: { $ne: null, $lt: new Date(now.getTime() - DAY / 2) } },
    "applicationId deadline",
  ).lean()) as { _id: unknown; applicationId?: unknown; deadline: Date }[];
  for (const lead of missed) {
    await JobLead.updateOne(
      { _id: lead._id },
      { $set: { status: "expired", statusChangedAt: now, expiresAt: new Date(now.getTime() + 30 * DAY) } },
    );
    if (lead.applicationId) {
      const note = `Posting closed on ${new Date(lead.deadline).toISOString().slice(0, 10)} before it was submitted.`;
      await Application.updateOne(
        { _id: lead.applicationId, userId, applicationStatus: { $in: ["Wishlist", "Not Completed"] } },
        [{ $set: { notes: { $trim: { input: { $concat: [{ $ifNull: ["$notes", ""] }, "\n", note] } } } } }],
      ).catch(() => undefined);
    }
  }
  return missed.length;
}

export type DeliveryOutcome = { report: DailyReport | null; emailed: boolean; notified: boolean; webhook: boolean };

export async function deliverDailyReport(userId: string, now = new Date()): Promise<DeliveryOutcome> {
  const out: DeliveryOutcome = { report: null, emailed: false, notified: false, webhook: false };
  const report = await buildDailyReport(userId, { now, polish: true });
  if (!report) return out;
  out.report = report;

  await dbConnect();
  const user = (await User.findById(userId, "name email jobHunt").lean()) as { name?: string; email?: string; jobHunt?: unknown } | null;
  const settings = normaliseJobHunt(user?.jobHunt);
  const reportUrl = `${SITE_URL}/me/jobs/report`;

  const prefs = await loadNotificationPrefs(userId);
  if (!isMuted(prefs, "job-hunt")) {
    await notify({
      userId,
      type: "job-hunt",
      title: `Job hunt: ${report.summary[0] ?? "daily report"}`,
      body: report.summary.slice(1).join(" "),
      href: "/me/jobs/report",
    });
    out.notified = true;
  }

  if (settings.reportEmail && user?.email) {
    const res = await sendJobHuntReportMail(user.email, {
      name: user.name ?? "",
      date: report.date,
      summary: report.summary,
      newLeads: report.newLeads.top.map((l) => ({ company: l.company, title: l.title, platform: l.platform, fitScore: l.fitScore })),
      ready: report.waiting.ready.map((l) => ({ company: l.company, title: l.title })),
      deadlines: report.deadlines.map((l) => ({ company: l.company, title: l.title, deadline: l.deadline })),
      suggestions: report.suggestions,
      reportUrl,
      inboxUrl: `${SITE_URL}/me/jobs`,
      settingsUrl: `${SITE_URL}/me/settings?tab=job-hunt`,
    });
    out.emailed = res.ok;
  }

  const hook = await sendWebhook(userId, "report.daily", {
    date: report.date,
    summary: report.summary,
    newLeads: report.newLeads.total,
    ready: report.waiting.ready.length,
    deadlines: report.deadlines.length,
    suggestions: report.suggestions,
    url: reportUrl,
  });
  out.webhook = hook.delivered;
  return out;
}

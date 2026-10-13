import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import JobLead from "@/models/JobLead";
import Interview from "@/models/Interview";

const RESPONDED = new Set([
  "Interview Scheduled", "Active - Written", "Active - HR", "Active - Technical", "Active - Cultural Fit",
  "Offer Received", "Rejected",
]);
const INTERVIEWED = new Set([
  "Interview Scheduled", "Active - Written", "Active - HR", "Active - Technical", "Active - Cultural Fit", "Offer Received",
]);

export type InsightRow = {
  id: string;
  company: string;
  title: string;
  platform: string;
  source: string;
  status: string;
  createdAt: string | null;
  appliedAt: string | null;
  appliedWeekday: number | null;
  postedAt: string | null;
  deadline: string | null;
  submissionMethod: string;
  fitScore: number | null;
  responded: boolean;
  interviewed: boolean;
  offer: boolean;
  rejected: boolean;
  daysToFirstResponse: number | null;
  interviewRounds: number;
};

type AppLite = {
  _id: { toString(): string };
  companyName: string;
  jobTitle: string;
  platform?: string;
  applicationStatus?: string;
  createdAt?: Date;
  appliedDate?: Date | null;
  postedAt?: Date | null;
  deadline?: Date | null;
  submissionMethod?: string;
  leadId?: { toString(): string } | null;
  statusHistory?: { status: string; at: Date }[];
};

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

/* "Responded" means the company moved the application past Submitted or No
   Response at some point, so a rejection counts as a response: for tuning
   where to apply, a fast no is information, silence is not. */
export function toInsightRow(
  app: AppLite,
  lead: { fitScore?: number | null; source?: string } | undefined,
  interviewRounds: number,
): InsightRow {
  const history = app.statusHistory ?? [];
  const statuses = new Set([app.applicationStatus ?? "", ...history.map((h) => h.status)]);
  const appliedAt = app.appliedDate ?? history.find((h) => h.status === "Submitted")?.at ?? null;
  const firstResponse = history.find((h) => RESPONDED.has(h.status))?.at ?? null;
  const days = appliedAt && firstResponse
    ? Math.max(0, Math.round((new Date(firstResponse).getTime() - new Date(appliedAt).getTime()) / 86_400_000))
    : null;
  return {
    id: app._id.toString(),
    company: app.companyName,
    title: app.jobTitle,
    platform: app.platform ?? "Other",
    source: lead?.source ?? "manual",
    status: app.applicationStatus ?? "",
    createdAt: iso(app.createdAt),
    appliedAt: iso(appliedAt),
    appliedWeekday: appliedAt ? new Date(appliedAt).getDay() : null,
    postedAt: iso(app.postedAt),
    deadline: iso(app.deadline),
    submissionMethod: app.submissionMethod ?? "",
    fitScore: typeof lead?.fitScore === "number" ? lead.fitScore : null,
    responded: [...statuses].some((s) => RESPONDED.has(s)),
    interviewed: [...statuses].some((s) => INTERVIEWED.has(s)) || interviewRounds > 0,
    offer: statuses.has("Offer Received"),
    rejected: statuses.has("Rejected"),
    daysToFirstResponse: days,
    interviewRounds,
  };
}

export async function loadInsights(userId: string, sinceDays = 180) {
  await dbConnect();
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const apps = (await Application.find(
    { userId, createdAt: { $gte: since } },
    "companyName jobTitle platform applicationStatus createdAt appliedDate postedAt deadline submissionMethod leadId statusHistory",
  ).lean()) as AppLite[];

  const leadIds = apps.map((a) => a.leadId).filter(Boolean);
  const [leads, interviews] = await Promise.all([
    leadIds.length ? JobLead.find({ _id: { $in: leadIds } }, "fitScore source").lean() : Promise.resolve([]),
    Interview.aggregate([
      { $match: { applicationId: { $in: apps.map((a) => a._id) } } },
      { $group: { _id: "$applicationId", n: { $sum: 1 } } },
    ]),
  ]);

  const leadById = new Map((leads as { _id: { toString(): string }; fitScore?: number | null; source?: string }[]).map((l) => [l._id.toString(), l]));
  const roundsByApp = new Map((interviews as { _id: { toString(): string }; n: number }[]).map((r) => [r._id.toString(), r.n]));

  const rows = apps.map((a) => toInsightRow(a, a.leadId ? leadById.get(a.leadId.toString()) : undefined, roundsByApp.get(a._id.toString()) ?? 0));
  const funnel = await leadFunnel(userId, since);
  return { generatedAt: new Date().toISOString(), sinceDays, applications: rows, leadFunnel: funnel };
}

export async function leadFunnel(userId: string, since: Date): Promise<Record<string, number>> {
  const rows = (await JobLead.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), firstSeenAt: { $gte: since } } },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ])) as { _id: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

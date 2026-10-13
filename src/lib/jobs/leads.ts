import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";
import CVFile from "@/models/CVFile";
import { historyActor, updateApplication } from "@/lib/applicationHistory";
import { SUBMISSION_METHODS, SUBMITTED_STATUS } from "@/constants/applicationStatus";
import { OPEN_LEAD_STATUSES, LEAD_STATUSES, type LeadStatus } from "@/lib/jobs/constants";
import { TARGET_PLATFORMS, targetPlatformFor, type JobHuntSettings, type TargetPlatform } from "@/lib/jobs/settings";
import { parsePage, envelope } from "@/lib/pagination";

const DAY = 86_400_000;
const DISMISS_TTL_DAYS = 30;

export type LeadView = {
  _id: string;
  source: string;
  platform: string;
  company: string;
  title: string;
  location: string;
  url: string;
  applyUrl: string;
  otherUrls: string[];
  postedAt: string | null;
  postedAgeText: string;
  deadline: string | null;
  description?: string;
  salary: string;
  remote: boolean;
  fitScore: number | null;
  fitMode: string;
  fitGaps: { requirement: string; level?: string; verdict?: string; question: string; answer: string }[];
  status: LeadStatus;
  statusChangedAt: string | null;
  applicationId: string | null;
  cvFileIds: string[];
  prepared: {
    tailorMode: string; letterMode: string; changedFields: string[]; note: string;
    letter: unknown; output: string; at: string | null;
  } | null;
  error: string;
  firstSeenAt: string | null;
  searchId: string | null;
};

type Raw = Record<string, unknown> & { _id: { toString(): string } };

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function leadView(raw: Raw, withDescription = false): LeadView {
  const prepared = raw.prepared as Record<string, unknown> | undefined;
  return {
    _id: raw._id.toString(),
    source: str(raw.source),
    platform: str(raw.platform) || "Other",
    company: str(raw.company),
    title: str(raw.title),
    location: str(raw.location),
    url: str(raw.url),
    applyUrl: str(raw.applyUrl) || str(raw.url),
    otherUrls: (raw.otherUrls as string[] | undefined) ?? [],
    postedAt: iso(raw.postedAt),
    postedAgeText: str(raw.postedAgeText),
    deadline: iso(raw.deadline),
    ...(withDescription ? { description: str(raw.description) } : {}),
    salary: str(raw.salary),
    remote: raw.remote === true,
    fitScore: typeof raw.fitScore === "number" ? raw.fitScore : null,
    fitMode: str(raw.fitMode),
    fitGaps: ((raw.fitGaps as Record<string, unknown>[] | undefined) ?? []).map((g) => ({
      requirement: str(g.requirement),
      level: str(g.level) || undefined,
      verdict: str(g.verdict) || undefined,
      question: str(g.question),
      answer: str(g.answer),
    })),
    status: (LEAD_STATUSES as readonly string[]).includes(str(raw.status)) ? (raw.status as LeadStatus) : "new",
    statusChangedAt: iso(raw.statusChangedAt),
    applicationId: raw.applicationId ? String(raw.applicationId) : null,
    cvFileIds: (raw.cvFileIds as string[] | undefined) ?? [],
    prepared: prepared?.at
      ? {
          tailorMode: str(prepared.tailorMode),
          letterMode: str(prepared.letterMode),
          changedFields: (prepared.changedFields as string[] | undefined) ?? [],
          note: str(prepared.note),
          letter: prepared.letter ?? null,
          output: str(prepared.output),
          at: iso(prepared.at),
        }
      : null,
    error: str(raw.error),
    firstSeenAt: iso(raw.firstSeenAt),
    searchId: raw.searchId ? String(raw.searchId) : null,
  };
}

export const LIST_PROJECTION = { description: 0, ingestKey: 0, "prepared.letter": 0 };

export type LeadListQuery = {
  status: string;
  platform: string;
  q: string;
  sort: "fit" | "new" | "deadline";
  minFit: number;
};

export function parseLeadQuery(params: URLSearchParams): LeadListQuery {
  const sort = params.get("sort");
  return {
    status: params.get("status") ?? "open",
    platform: params.get("platform") ?? "",
    q: (params.get("q") ?? "").trim().slice(0, 100),
    sort: sort === "new" || sort === "deadline" ? sort : "fit",
    minFit: Math.max(0, Math.min(100, Number(params.get("minFit")) || 0)),
  };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PLATFORM_FILTER: Record<TargetPlatform, Record<string, unknown>> = {
  linkedin: { platform: "LinkedIn" },
  xing: { platform: "Xing" },
  stepstone: { platform: "StepStone" },
  other: { platform: { $nin: ["LinkedIn", "Xing", "StepStone"] } },
};

export function leadFilter(userId: string, q: LeadListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = { userId };
  if (q.status === "open") filter.status = { $in: OPEN_LEAD_STATUSES };
  else if ((LEAD_STATUSES as readonly string[]).includes(q.status)) filter.status = q.status;
  if ((TARGET_PLATFORMS as readonly string[]).includes(q.platform)) Object.assign(filter, PLATFORM_FILTER[q.platform as TargetPlatform]);
  if (q.minFit > 0) filter.fitScore = { $gte: q.minFit };
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: "i" };
    filter.$or = [{ company: rx }, { title: rx }, { location: rx }];
  }
  return filter;
}

const SORTS: Record<LeadListQuery["sort"], Record<string, 1 | -1>> = {
  fit: { fitScore: -1, firstSeenAt: -1 },
  new: { postedAt: -1, firstSeenAt: -1 },
  deadline: { deadline: 1, fitScore: -1 },
};

export async function listLeads(userId: string, params: URLSearchParams) {
  await dbConnect();
  const q = parseLeadQuery(params);
  const page = parsePage(params, { defaultLimit: 25, maxLimit: 100 });
  const filter = leadFilter(userId, q);
  const [rows, total] = await Promise.all([
    JobLead.find(filter, LIST_PROJECTION).sort(SORTS[q.sort]).skip(page.skip).limit(page.limit).lean(),
    JobLead.countDocuments(filter),
  ]);
  return envelope((rows as Raw[]).map((r) => leadView(r)), total, page);
}

export type PlatformProgress = { target: number; submitted: number; ready: number; fresh: number };
export type LeadSummary = {
  date: string;
  platforms: Record<TargetPlatform, PlatformProgress>;
  totals: { fresh: number; shortlisted: number; ready: number; applying: number; submittedToday: number; target: number; failed: number };
  nextDeadline: string | null;
};

export function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function leadSummary(userId: string, settings: JobHuntSettings, now = new Date()): Promise<LeadSummary> {
  await dbConnect();
  const today = startOfLocalDay(now);
  const rows = (await JobLead.find(
    {
      userId,
      $or: [{ status: { $in: OPEN_LEAD_STATUSES } }, { status: "submitted", submittedAt: { $gte: today } }],
    },
    "platform status submittedAt deadline firstSeenAt",
  ).lean()) as { platform?: string; status: string; submittedAt?: Date | null; deadline?: Date | null; firstSeenAt?: Date }[];

  const platforms = Object.fromEntries(
    TARGET_PLATFORMS.map((p) => [p, { target: settings.dailyTargets[p], submitted: 0, ready: 0, fresh: 0 }]),
  ) as Record<TargetPlatform, PlatformProgress>;
  const totals = { fresh: 0, shortlisted: 0, ready: 0, applying: 0, submittedToday: 0, target: 0, failed: 0 };
  let nextDeadline: Date | null = null;

  for (const r of rows) {
    const p = platforms[targetPlatformFor(r.platform)];
    if (r.status === "submitted") {
      p.submitted++;
      totals.submittedToday++;
      continue;
    }
    if (r.status === "new") {
      totals.fresh++;
      p.fresh++;
    }
    if (r.status === "shortlisted") totals.shortlisted++;
    if (r.status === "ready") {
      totals.ready++;
      p.ready++;
    }
    if (r.status === "applying") totals.applying++;
    if (r.status === "failed") totals.failed++;
    if (r.deadline && r.deadline >= today && (!nextDeadline || r.deadline < nextDeadline)) nextDeadline = r.deadline;
  }
  totals.target = TARGET_PLATFORMS.reduce((s, p) => s + platforms[p].target, 0);

  return { date: today.toISOString().slice(0, 10), platforms, totals, nextDeadline: nextDeadline ? nextDeadline.toISOString() : null };
}

export const LEAD_ACTIONS = ["shortlist", "dismiss", "restore", "approve", "applying", "submitted", "answers"] as const;
export type LeadAction = (typeof LEAD_ACTIONS)[number];

const ALLOWED_FROM: Record<Exclude<LeadAction, "answers">, readonly string[]> = {
  shortlist: ["new", "expired", "dismissed"],
  dismiss: ["new", "shortlisted", "ready", "failed", "expired", "applying"],
  restore: ["dismissed", "expired"],
  approve: ["ready"],
  applying: ["ready"],
  submitted: ["ready", "applying"],
};

const SUBMISSION_FOR: Record<string, string> = {
  LinkedIn: "LinkedIn Easy Apply",
  Xing: "XING Apply",
  StepStone: "Online / Job Portal",
  Indeed: "Indeed Apply",
};

export type ActionResult = { ok: true; lead: LeadView } | { ok: false; status: number; error: string };

export async function applyLeadAction(
  userId: string,
  leadId: string,
  action: LeadAction,
  body: { answers?: { requirement?: string; answer?: string }[]; submissionMethod?: string } = {},
): Promise<ActionResult> {
  await dbConnect();
  const lead = (await JobLead.findOne({ _id: leadId, userId }).lean()) as Raw | null;
  if (!lead) return { ok: false, status: 404, error: "Not found" };
  const now = new Date();

  if (action === "answers") {
    const answers = new Map(
      (body.answers ?? []).map((a) => [(a.requirement ?? "").toLowerCase(), String(a.answer ?? "").slice(0, 1000)]),
    );
    const gaps = ((lead.fitGaps as Record<string, unknown>[] | undefined) ?? []).map((g) => ({
      ...g,
      answer: answers.has(str(g.requirement).toLowerCase()) ? answers.get(str(g.requirement).toLowerCase()) : str(g.answer),
    }));
    const updated = (await JobLead.findOneAndUpdate({ _id: leadId, userId }, { $set: { fitGaps: gaps } }, { new: true }).lean()) as Raw;
    return { ok: true, lead: leadView(updated, true) };
  }

  if (!ALLOWED_FROM[action].includes(str(lead.status))) {
    return { ok: false, status: 409, error: `Cannot ${action} a lead that is ${str(lead.status)}.` };
  }

  const set: Record<string, unknown> = { statusChangedAt: now };
  if (action === "shortlist") Object.assign(set, { status: "shortlisted", expiresAt: null });
  if (action === "dismiss") Object.assign(set, { status: "dismissed", expiresAt: new Date(now.getTime() + DISMISS_TTL_DAYS * DAY) });
  if (action === "restore") Object.assign(set, { status: "new", expiresAt: null });
  if (action === "approve") Object.assign(set, { status: "ready", approvedAt: now });
  if (action === "applying") Object.assign(set, { status: "applying", approvedAt: lead.approvedAt ?? now });
  if (action === "submitted") {
    Object.assign(set, { status: "submitted", submittedAt: now });
    if (lead.applicationId) {
      const method = body.submissionMethod && (SUBMISSION_METHODS as readonly string[]).includes(body.submissionMethod)
        ? body.submissionMethod
        : SUBMISSION_FOR[str(lead.platform)] ?? "Company Application Form";
      await updateApplication(
        { _id: lead.applicationId, userId },
        { applicationStatus: SUBMITTED_STATUS, appliedDate: now, submissionMethod: method },
        () => historyActor(userId),
      ).catch(() => null);
    }
  }

  const updated = (await JobLead.findOneAndUpdate({ _id: leadId, userId }, { $set: set }, { new: true }).lean()) as Raw;
  return { ok: true, lead: leadView(updated, true) };
}

export async function leadFiles(userId: string, ids: string[]) {
  if (!ids.length) return [];
  await dbConnect();
  const rows = (await CVFile.find({ _id: { $in: ids }, userId }, "name mimeType size genDocType genOutput uploadedAt").lean()) as
    { _id: unknown; name: string; mimeType: string; size: number; genDocType?: string; genOutput?: string; uploadedAt?: Date }[];
  return rows.map((r) => ({
    _id: String(r._id),
    name: r.name,
    mimeType: r.mimeType,
    size: r.size,
    docType: r.genDocType ?? "",
    output: r.genOutput ?? "",
    uploadedAt: iso(r.uploadedAt),
  }));
}

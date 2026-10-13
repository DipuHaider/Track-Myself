import dbConnect from "@/lib/db";
import JobSearch from "@/models/JobSearch";
import JobLead from "@/models/JobLead";
import User from "@/models/User";
import { resolveGenerationContent } from "@/lib/cv/generatePipeline";
import { searchBa, baDetail } from "@/lib/jobs/sources/ba";
import { searchAdzuna } from "@/lib/jobs/sources/adzuna";
import { toLeadDraft, withinAge } from "@/lib/jobs/normalise";
import { ingestLeads, expireLeads } from "@/lib/jobs/ingest";
import { normaliseJobHunt } from "@/lib/jobs/settings";
import { emitLeadsCreated } from "@/lib/jobs/events";
import type { LeadDraft, RawLead, SearchQuery } from "@/lib/jobs/types";
import type { CVContent } from "@/types/cv";
import type { Role } from "@/lib/permissions";

const DETAIL_LIMIT = 15;
const DETAIL_CONCURRENCY = 4;

export type HuntSummary = {
  userId: string;
  searches: number;
  received: number;
  created: number;
  merged: number;
  tracked: number;
  expired: number;
  tooOld: number;
  errors: string[];
  createdIds: string[];
  cutShort: boolean;
};

type SearchRow = {
  _id: { toString(): string };
  keywords: string;
  location?: string;
  radiusKm?: number;
  maxAgeDays?: number;
  remote?: boolean;
  sources?: string[];
  excludeCompanies?: string[];
};

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export async function loadCvForScoring(user: { id: string; role: Role; plan: string }): Promise<CVContent | null> {
  try {
    const res = await resolveGenerationContent({ id: user.id, role: user.role, plan: user.plan }, {});
    return res.ok ? res.content : null;
  } catch {
    return null;
  }
}

/* Only BA hits that are new to this user get a detail call: the list endpoint
   has no description, and fetching one for every repeat would spend the time
   budget on jobs already in the inbox. */
async function enrichBa(userId: string, raws: RawLead[], deadlineAt: number): Promise<void> {
  const ba = raws.filter((r) => r.source === "ba");
  if (!ba.length) return;
  const known = new Set(
    ((await JobLead.find({ userId, source: "ba", externalId: { $in: ba.map((r) => r.externalId) } }, "externalId").lean()) as
      { externalId: string }[]).map((l) => l.externalId),
  );
  const fresh = ba.filter((r) => !known.has(r.externalId)).slice(0, DETAIL_LIMIT);
  await pool(fresh, DETAIL_CONCURRENCY, async (raw) => {
    if (Date.now() > deadlineAt) return;
    const detail = await baDetail(raw.externalId);
    if (!detail) return;
    raw.description = detail.description;
    raw.applyUrl = detail.applyUrl ?? raw.applyUrl;
    raw.deadline = detail.deadline ?? raw.deadline;
    raw.salary = detail.salary || raw.salary;
  });
}

export async function runHuntForUser(
  userId: string,
  opts: { deadlineAt?: number; now?: Date } = {},
): Promise<HuntSummary> {
  const now = opts.now ?? new Date();
  const deadlineAt = opts.deadlineAt ?? Date.now() + 45_000;
  const summary: HuntSummary = {
    userId, searches: 0, received: 0, created: 0, merged: 0, tracked: 0, expired: 0, tooOld: 0, errors: [], createdIds: [], cutShort: false,
  };

  await dbConnect();
  const user = (await User.findById(userId, "role plan status jobHunt").lean()) as
    | { role: Role; plan: string; status?: string; jobHunt?: unknown }
    | null;
  if (!user || user.status === "paused") return summary;

  const searches = (await JobSearch.find({ userId, active: true }).lean()) as SearchRow[];
  const cv = await loadCvForScoring({ id: userId, role: user.role, plan: user.plan });

  for (const search of searches) {
    if (Date.now() > deadlineAt) {
      summary.cutShort = true;
      break;
    }
    summary.searches++;
    const sources = search.sources ?? ["ba", "adzuna"];
    const q: SearchQuery = {
      keywords: search.keywords,
      location: search.location ?? "",
      radiusKm: search.radiusKm ?? 25,
      maxAgeDays: search.maxAgeDays ?? 3,
      remote: search.remote === true,
    };

    const results = await Promise.all([
      sources.includes("ba") ? searchBa(q) : Promise.resolve({ leads: [], errors: [] }),
      sources.includes("adzuna") ? searchAdzuna(q) : Promise.resolve({ leads: [], errors: [] }),
    ]);
    const raws = results.flatMap((r) => r.leads);
    summary.errors.push(...results.flatMap((r) => r.errors));

    await enrichBa(userId, raws, deadlineAt);

    const parsed = raws.map((r) => toLeadDraft(r, now)).filter((d): d is LeadDraft => d !== null);
    const fresh = parsed.filter((d) => withinAge(d.postedAt, q.maxAgeDays, now));
    summary.tooOld += parsed.length - fresh.length;
    const drafts = fresh
      .filter((d) => !q.remote || d.remote || /remote|home.?office/i.test(`${d.title} ${d.location}`));

    const res = await ingestLeads(userId, drafts, {
      searchId: search._id.toString(),
      cv,
      excludeCompanies: search.excludeCompanies,
    });
    summary.received += res.received;
    summary.created += res.created;
    summary.merged += res.merged;
    summary.tracked += res.tracked;
    summary.createdIds.push(...res.createdIds);

    await JobSearch.updateOne(
      { _id: search._id },
      {
        $set: {
          lastRunAt: now,
          lastRunSummary: { received: res.received, created: res.created, tooOld: parsed.length - fresh.length, errors: results.flatMap((r) => r.errors).slice(0, 3) },
        },
      },
    );
  }

  summary.expired = await expireLeads(userId, now);
  await emitLeadsCreated(userId, summary.createdIds, "search").catch(() => undefined);
  return summary;
}

export async function jobHuntEnabledUserIds(): Promise<string[]> {
  await dbConnect();
  const rows = (await User.find({ "jobHunt.enabled": true, status: "active", deletingAt: null }, "_id jobHunt").lean()) as
    { _id: { toString(): string }; jobHunt?: unknown }[];
  return rows.filter((r) => normaliseJobHunt(r.jobHunt).enabled).map((r) => r._id.toString());
}

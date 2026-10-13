import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import JobLead from "@/models/JobLead";
import { matchKeyFor, identityFor } from "@/lib/jobs/normalise";
import { normaliseCompany } from "@/lib/applicationFlags";
import { fitScore } from "@/lib/jobs/score";
import type { LeadDraft } from "@/lib/jobs/types";
import type { CVContent } from "@/types/cv";

export type IngestSummary = {
  received: number;
  created: number;
  merged: number;
  tracked: number;
  createdIds: string[];
};

type ExistingLead = {
  _id: mongoose.Types.ObjectId;
  identity?: string;
  matchKey?: string;
  description?: string;
  url?: string;
  otherUrls?: string[];
  deadline?: Date | null;
};

/* One path for every way a job reaches the inbox: the scheduled search, the
   extension harvest and the automation API. A posting already tracked as an
   application is skipped; one already in the inbox under another source is
   merged into the existing lead (longest description, extra links, a deadline
   if it lacked one) so the same job never shows twice. */
export async function ingestLeads(
  userId: string,
  drafts: LeadDraft[],
  opts: { searchId?: string | null; cv?: CVContent | null; ingestKey?: string; excludeCompanies?: string[] } = {},
): Promise<IngestSummary> {
  await dbConnect();
  const summary: IngestSummary = { received: drafts.length, created: 0, merged: 0, tracked: 0, createdIds: [] };
  if (!drafts.length) return summary;

  const excluded = new Set((opts.excludeCompanies ?? []).map(normaliseCompany).filter(Boolean));

  const apps = (await Application.find({ userId }, "companyName jobTitle jobPostUrl additionalJobPostUrls").lean()) as {
    companyName: string; jobTitle: string; jobPostUrl?: string; additionalJobPostUrls?: string[];
  }[];
  const trackedIdentity = new Set<string>();
  const trackedKey = new Set<string>();
  for (const app of apps) {
    const id = identityFor([app.jobPostUrl, ...(app.additionalJobPostUrls ?? [])], "");
    if (id) trackedIdentity.add(id);
    const key = matchKeyFor(app.companyName, app.jobTitle);
    if (key) trackedKey.add(key);
  }

  const identities = [...new Set(drafts.map((d) => d.identity))];
  const keys = [...new Set(drafts.map((d) => d.matchKey).filter(Boolean))];
  const existing = (await JobLead.find(
    { userId, $or: [{ identity: { $in: identities } }, { matchKey: { $in: keys } }] },
    "identity matchKey description url otherUrls deadline",
  ).lean()) as ExistingLead[];
  const byIdentity = new Map(existing.map((l) => [l.identity ?? "", l]));
  const byKey = new Map(existing.filter((l) => l.matchKey).map((l) => [l.matchKey!, l]));

  const seenThisBatch = new Set<string>();

  for (const draft of drafts) {
    if (excluded.has(normaliseCompany(draft.company))) continue;
    if (trackedIdentity.has(draft.identity) || (draft.matchKey && trackedKey.has(draft.matchKey))) {
      summary.tracked++;
      continue;
    }
    const batchKey = draft.matchKey || draft.identity;
    if (seenThisBatch.has(batchKey)) {
      summary.merged++;
      continue;
    }
    seenThisBatch.add(batchKey);

    const prior = byIdentity.get(draft.identity) ?? (draft.matchKey ? byKey.get(draft.matchKey) : undefined);
    if (prior) {
      const set: Record<string, unknown> = {};
      if ((draft.description?.length ?? 0) > (prior.description?.length ?? 0)) set.description = draft.description;
      if (!prior.deadline && draft.deadline) set.deadline = draft.deadline;
      const urls = [draft.url, draft.applyUrl].filter((u) => u && u !== prior.url && !(prior.otherUrls ?? []).includes(u));
      const update: Record<string, unknown> = {};
      if (Object.keys(set).length) update.$set = set;
      if (urls.length) update.$addToSet = { otherUrls: { $each: urls.slice(0, 5) } };
      if (Object.keys(update).length) await JobLead.updateOne({ _id: prior._id }, update);
      summary.merged++;
      continue;
    }

    const fit = opts.cv ? fitScore(opts.cv, draft.title, draft.description) : null;
    const res = await JobLead.updateOne(
      { userId, source: draft.source, externalId: draft.externalId },
      {
        $setOnInsert: {
          ...draft,
          userId,
          searchId: opts.searchId ?? null,
          fitScore: fit ? fit.score : null,
          fitMode: fit ? "keyword" : "",
          fitGaps: fit
            ? fit.missing.slice(0, 6).map((w) => ({
                requirement: w,
                level: "unclear",
                verdict: "not-evidenced",
                question: `The posting mentions "${w}" and your CV does not. Have you done this?`,
              }))
            : [],
          status: "new",
          ingestKey: opts.ingestKey ?? "",
          firstSeenAt: new Date(),
          statusChangedAt: new Date(),
        },
      },
      { upsert: true },
    );
    if (res.upsertedId) {
      summary.created++;
      summary.createdIds.push(String(res.upsertedId));
    } else {
      summary.merged++;
    }
  }

  return summary;
}

const STALE_DAYS = 30;

export async function expireLeads(userId: string, now = new Date()): Promise<number> {
  await dbConnect();
  const staleBefore = new Date(now.getTime() - STALE_DAYS * 86_400_000);
  const res = await JobLead.updateMany(
    {
      userId,
      status: { $in: ["new", "shortlisted"] },
      $or: [{ deadline: { $ne: null, $lt: now } }, { firstSeenAt: { $lt: staleBefore } }],
    },
    { $set: { status: "expired", statusChangedAt: now, expiresAt: new Date(now.getTime() + STALE_DAYS * 86_400_000) } },
  );
  return res.modifiedCount ?? 0;
}

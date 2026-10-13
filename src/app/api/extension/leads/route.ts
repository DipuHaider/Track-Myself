export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withCors } from "@/lib/extensionCors";
import { getExtensionHuntUser } from "@/lib/extensionAuth";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { ingestLeads } from "@/lib/jobs/ingest";
import { loadCvForScoring } from "@/lib/jobs/hunt";
import { emitLeadsCreated } from "@/lib/jobs/events";
import { draftsFromInput, ingestLeadSchema } from "@/lib/jobs/ingestApi";
import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";

const schema = z.object({
  site: z.enum(["linkedin", "xing", "stepstone", "indeed"]),
  leads: z.array(ingestLeadSchema).min(1).max(50),
});

export async function OPTIONS(req: Request) {
  return withCors(req, new NextResponse(null, { status: 204 }));
}

/* Leads waiting to be applied to, so the panel can offer them on a posting
   the owner reached without the #tm-lead link. */
export async function GET(req: Request) {
  return withCors(req, await list(req));
}

async function list(req: Request) {
  const user = await getExtensionHuntUser(req);
  if ("error" in user) return NextResponse.json({ error: user.error }, { status: user.status });
  await dbConnect();
  const rows = (await JobLead.find({ userId: user.id, status: { $in: ["ready", "applying"] } }, "company title platform applyUrl url")
    .sort({ statusChangedAt: -1 }).limit(30).lean()) as
    { _id: { toString(): string }; company: string; title: string; platform?: string; applyUrl?: string; url?: string }[];
  return NextResponse.json(rows.map((r) => ({
    id: r._id.toString(), company: r.company, title: r.title, platform: r.platform ?? "Other", applyUrl: r.applyUrl || r.url || "",
  })));
}

/* Search-result harvest: the owner pressed "Send to TrackMyself" on a results
   page they opened themselves. The cards carry title, company, link and
   posted text; the description arrives later when a posting is opened. */
export async function POST(req: Request) {
  return withCors(req, await handle(req));
}

async function handle(req: Request) {
  const user = await getExtensionHuntUser(req);
  if ("error" in user) return NextResponse.json({ error: user.error }, { status: user.status });

  const gate = await checkRateLimitDb({ key: `ext-harvest:user:${user.id}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "Twenty batches an hour.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid batch" }, { status: 400 });

  const drafts = draftsFromInput(parsed.data.site, parsed.data.leads);
  const cv = await loadCvForScoring(user);
  const res = await ingestLeads(user.id, drafts, { cv });
  await emitLeadsCreated(user.id, res.createdIds, "extension").catch(() => undefined);
  return NextResponse.json({ created: res.created, merged: res.merged, tracked: res.tracked, rejected: parsed.data.leads.length - drafts.length });
}

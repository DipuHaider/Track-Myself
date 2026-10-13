export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";
import { authenticateToken } from "@/lib/apiTokens";
import { listLeads } from "@/lib/jobs/leads";
import { ingestLeads } from "@/lib/jobs/ingest";
import { loadCvForScoring } from "@/lib/jobs/hunt";
import { emitLeadsCreated } from "@/lib/jobs/events";
import { draftsFromInput, ingestBatchSchema } from "@/lib/jobs/ingestApi";
import { badRequest } from "@/lib/api/respond";

export async function GET(req: Request) {
  const auth = await authenticateToken(req, "leads:read");
  if (auth instanceof NextResponse) return auth;
  const params = new URL(req.url).searchParams;
  if (!params.has("page")) params.set("page", "1");
  return NextResponse.json(await listLeads(auth.id, params));
}

/* Ingest from automations (n8n parsing job-alert emails, scripts, the MCP
   server). Same normalise, dedupe and score path as the daily search. An
   Idempotency-Key header makes a retried batch a no-op. */
export async function POST(req: Request) {
  const auth = await authenticateToken(req, "leads:write");
  if (auth instanceof NextResponse) return auth;

  const key = (req.headers.get("idempotency-key") ?? "").trim().slice(0, 200);
  if (key) {
    await dbConnect();
    if (await JobLead.exists({ userId: auth.id, ingestKey: key })) {
      return NextResponse.json({ duplicateRequest: true, created: 0 });
    }
  }

  const parsed = ingestBatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return badRequest(issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid batch");
  }

  const drafts = draftsFromInput(parsed.data.source, parsed.data.leads);
  const cv = await loadCvForScoring({ id: auth.id, role: auth.role, plan: auth.plan });
  const res = await ingestLeads(auth.id, drafts, { cv, ingestKey: key || undefined });
  await emitLeadsCreated(auth.id, res.createdIds, "api").catch(() => undefined);
  return NextResponse.json({ ...res, rejected: parsed.data.leads.length - drafts.length }, { status: res.created ? 201 : 200 });
}

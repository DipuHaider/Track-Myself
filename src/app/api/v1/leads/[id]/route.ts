export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";
import { authenticateToken } from "@/lib/apiTokens";
import { applyLeadAction, leadView } from "@/lib/jobs/leads";
import { parseObjectId } from "@/lib/objectId";
import { badRequest, notFound } from "@/lib/api/respond";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticateToken(req, "leads:read");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();
  await dbConnect();
  const raw = (await JobLead.findOne({ _id: id, userId: auth.id }, { ingestKey: 0 }).lean()) as
    | (Record<string, unknown> & { _id: { toString(): string } })
    | null;
  if (!raw) return notFound();
  return NextResponse.json(leadView(raw, true));
}

/* Automations may triage but not approve or submit: those stay with the
   person, in the review page and the extension. */
const schema = z.object({
  action: z.enum(["shortlist", "dismiss", "restore", "answers"]),
  answers: z.array(z.object({ requirement: z.string().max(300), answer: z.string().max(1000) })).max(20).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticateToken(req, "leads:write");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  const res = await applyLeadAction(auth.id, id, parsed.data.action, parsed.data);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.lead);
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import JobLead from "@/models/JobLead";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { applyLeadAction, leadFiles, leadView, LEAD_ACTIONS } from "@/lib/jobs/leads";
import { prepareLead } from "@/lib/jobs/prepare";
import { sanitizeLetter } from "@/lib/cv/coverLetter";
import { parseObjectId } from "@/lib/objectId";
import { badRequest, notFound } from "@/lib/api/respond";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  await dbConnect();
  const raw = (await JobLead.findOne({ _id: id, userId: auth.id }, { ingestKey: 0 }).lean()) as
    | (Record<string, unknown> & { _id: { toString(): string } })
    | null;
  if (!raw) return notFound();
  const lead = leadView(raw, true);
  return NextResponse.json({ lead, files: await leadFiles(auth.id, lead.cvFileIds) });
}

const patchSchema = z.object({
  action: z.enum([...LEAD_ACTIONS, "letter"]),
  answers: z.array(z.object({ requirement: z.string().max(300), answer: z.string().max(1000) })).max(20).optional(),
  submissionMethod: z.string().max(60).optional(),
  letter: z.unknown().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  const body = parsed.data;

  if (body.action === "letter") {
    const letter = sanitizeLetter(body.letter);
    if (!letter) return badRequest("That letter is empty or malformed.");
    const res = await prepareLead(id, auth, { letterOnly: letter });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.error === "Not found" ? 404 : 409 });
    return GET(req, { params });
  }

  const res = await applyLeadAction(auth.id, id, body.action, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ lead: res.lead });
}

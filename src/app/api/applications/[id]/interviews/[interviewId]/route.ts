export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import { requireActiveAuth } from "@/lib/serverAuth";
import { parseObjectId } from "@/lib/objectId";
import { interviewUpdateSchema } from "@/schemas/interviewSchema";

type Params = { params: Promise<{ id: string; interviewId: string }> };

async function scope(params: Params["params"], userId: string) {
  const { id, interviewId } = await params;
  if (!parseObjectId(id) || !parseObjectId(interviewId)) return null;
  await dbConnect();
  if (!(await Application.exists({ _id: id, userId }))) return null;
  return { _id: interviewId, applicationId: id };
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const filter = await scope(params, auth.id);
  if (!filter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = interviewUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) update[k] = v;
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await Interview.findOneAndUpdate(filter, { $set: { ...update, userId: auth.id } }, { new: true, runValidators: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const filter = await scope(params, auth.id);
  if (!filter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const removed = await Interview.findOneAndDelete(filter);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

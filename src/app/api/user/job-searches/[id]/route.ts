export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobSearch from "@/models/JobSearch";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { jobSearchPatchSchema } from "@/schemas/jobSearchSchema";
import { parseObjectId } from "@/lib/objectId";
import { badRequest, notFound } from "@/lib/api/respond";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  const parsed = jobSearchPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid search");

  await dbConnect();
  const row = await JobSearch.findOneAndUpdate({ _id: id, userId: auth.id }, { $set: parsed.data }, { new: true }).lean();
  if (!row) return notFound();
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  await dbConnect();
  const res = await JobSearch.deleteOne({ _id: id, userId: auth.id });
  if (!res.deletedCount) return notFound();
  return NextResponse.json({ ok: true });
}

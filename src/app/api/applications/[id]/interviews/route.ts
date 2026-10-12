export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import { requireActiveAuth, requireAuth } from "@/lib/serverAuth";
import { parseObjectId } from "@/lib/objectId";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { interviewCreateSchema } from "@/schemas/interviewSchema";

const MAX_PER_APPLICATION = 20;

type Params = { params: Promise<{ id: string }> };

async function ownedApplication(id: string, userId: string) {
  if (!parseObjectId(id)) return null;
  return Application.exists({ _id: id, userId });
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await dbConnect();
  if (!(await ownedApplication(id, auth.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await Interview.find({ applicationId: id }).sort({ scheduledDate: 1, createdAt: 1 }).lean();
  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `interviews:user:${auth.id}`, limit: 60, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const { id } = await params;
  await dbConnect();
  if (!(await ownedApplication(id, auth.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = interviewCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form" }, { status: 400 });
  }

  const count = await Interview.countDocuments({ applicationId: id });
  if (count >= MAX_PER_APPLICATION) {
    return NextResponse.json({ error: `An application can hold up to ${MAX_PER_APPLICATION} interview rounds.` }, { status: 400 });
  }

  const created = await Interview.create({ ...parsed.data, applicationId: id, userId: auth.id });
  return NextResponse.json(created, { status: 201 });
}

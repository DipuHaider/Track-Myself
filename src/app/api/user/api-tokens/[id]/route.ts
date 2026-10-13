export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ApiToken from "@/models/ApiToken";
import { requireAuth } from "@/lib/serverAuth";
import { parseObjectId } from "@/lib/objectId";
import { notFound } from "@/lib/api/respond";

type Ctx = { params: Promise<{ id: string }> };

/* Revoking works on any plan and while paused: an owner must always be able
   to cut off an automation, even one created before a downgrade. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  await dbConnect();
  const res = await ApiToken.updateOne({ _id: id, userId: auth.id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  if (!res.matchedCount) return notFound();
  return NextResponse.json({ ok: true });
}

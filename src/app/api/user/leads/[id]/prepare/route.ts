export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { prepareLead } from "@/lib/jobs/prepare";
import { parseObjectId } from "@/lib/objectId";
import { notFound, tooMany } from "@/lib/api/respond";
import { checkRateLimitDb } from "@/lib/rateLimitStore";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  const gate = await checkRateLimitDb({ key: `lead-prepare:user:${auth.id}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "You can prepare twenty applications an hour.");

  const body = (await req.json().catch(() => ({}))) as { correction?: unknown };
  const correction = typeof body.correction === "string" ? body.correction.slice(0, 2000) : undefined;

  const res = await prepareLead(id, auth, { correction });
  if (!res.ok) {
    const status = res.error === "Not found" ? 404 : /cannot be prepared|paused/.test(res.error) ? 409 : 422;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json(res);
}

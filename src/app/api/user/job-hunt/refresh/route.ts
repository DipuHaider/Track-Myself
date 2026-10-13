export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { runHuntForUser } from "@/lib/jobs/hunt";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";

export async function POST() {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `job-hunt-refresh:user:${auth.id}`, limit: 4, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "You can refresh four times an hour. The daily search runs every morning.");

  const summary = await runHuntForUser(auth.id, { deadlineAt: Date.now() + 50_000 });
  return NextResponse.json(summary);
}

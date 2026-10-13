export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { authenticateToken } from "@/lib/apiTokens";
import { runHuntForUser } from "@/lib/jobs/hunt";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";

/* Lets an external scheduler (n8n, GitHub Actions) search more often than the
   once-a-day Vercel cron, within the same per-account limit as "Search now". */
export async function POST(req: Request) {
  const auth = await authenticateToken(req, "hunt:run");
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `job-hunt-refresh:user:${auth.id}`, limit: 4, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "Four searches an hour.");

  return NextResponse.json(await runHuntForUser(auth.id, { deadlineAt: Date.now() + 50_000 }));
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { rotateWebhookSecret, sendWebhook } from "@/lib/jobs/webhooks";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";

/* POST { action: "rotate" } returns a new signing secret, shown once.
   POST { action: "test" } sends a signed ping to the saved URL. */
export async function POST(req: Request) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `webhook-admin:user:${auth.id}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action === "rotate") {
    const secret = await rotateWebhookSecret(auth.id);
    if (!secret) {
      return NextResponse.json({ error: "Webhook signing needs AI_KEY_SECRET to be configured on this deployment." }, { status: 503 });
    }
    return NextResponse.json({ secret });
  }
  if (body.action === "test") {
    const res = await sendWebhook(auth.id, "lead.created", { test: true, message: "Hello from TrackMyself" }, { force: true });
    return NextResponse.json(res, { status: res.delivered ? 200 : 502 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

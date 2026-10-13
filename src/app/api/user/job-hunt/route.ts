export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { jobHuntAllowed, loadJobHunt, requireJobHuntAuth, saveJobHunt } from "@/lib/jobs/access";
import { jobHuntView, mergeClientPatch } from "@/lib/jobs/settings";
import { assertSafeBaseUrl } from "@/lib/net/safeUrl";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const allowed = await jobHuntAllowed(auth);
  const settings = await loadJobHunt(auth.id);
  return NextResponse.json({ allowed, settings: jobHuntView(settings) });
}

export async function PUT(req: Request) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `job-hunt-settings:user:${auth.id}`, limit: 60, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const current = await loadJobHunt(auth.id);
  const next = mergeClientPatch(current, body);

  if (next.webhook.url && next.webhook.url !== current.webhook.url) {
    const safe = await assertSafeBaseUrl(next.webhook.url, { label: "Webhook URL", useAllowlist: false });
    if (!safe.ok) return NextResponse.json({ error: safe.error }, { status: 400 });
    next.webhook.url = safe.url;
  }

  await saveJobHunt(auth.id, next);
  return NextResponse.json({ allowed: true, settings: jobHuntView(next) });
}

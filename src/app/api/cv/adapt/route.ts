export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireActiveAuth } from "@/lib/serverAuth";
import { normaliseContent } from "@/lib/cv/content";
import { getUserCredential } from "@/lib/ai/userKey";
import { aiEntitlement, type Actor } from "@/lib/ai/gateway";
import { JD_MAX, runTailor } from "@/lib/cv/ai/adapt";

/* Every call costs money, so this is capped per account rather than per IP. */
const ADAPT_LIMIT = 20;
const ADAPT_WINDOW_MS = 60 * 60 * 1000;

const STATUS: Record<string, number> = {
  "no-key": 503,
  "upstream": 502,
  "unparsable": 502,
  "error": 500,
};

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const jobDescription = String(body.jobDescription ?? "");
  const content = normaliseContent(body.content ?? body.cvData);

  if (!jobDescription.trim()) {
    return NextResponse.json({ error: "Job description is required." }, { status: 400 });
  }
  if (jobDescription.length > JD_MAX) {
    return NextResponse.json(
      { error: `That job description is ${jobDescription.length.toLocaleString()} characters. Paste the role and requirements only — up to ${JD_MAX.toLocaleString()}.` },
      { status: 400 },
    );
  }

  const userKey = await getUserCredential(auth.id);
  const actor: Actor = { kind: "user", id: auth.id, role: auth.role, plan: auth.plan, status: auth.status };

  const ent = await aiEntitlement(actor, "cv.adapt", userKey);
  if (!ent.allowed) {
    const status = ent.reason === "upgrade" ? 403 : ent.reason === "paused" ? 423 : 503;
    return NextResponse.json({ error: ent.message, upgrade: ent.reason === "upgrade" }, { status });
  }

  const result = await runTailor(content, jobDescription, {
    actor,
    userKey,
    rate: { limit: ADAPT_LIMIT, windowMs: ADAPT_WINDOW_MS },
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: STATUS[result.kind] ?? 500 });
  }

  return NextResponse.json({ ...result.value, provider: result.provider, providerLabel: result.providerLabel, note: ent.note });
}

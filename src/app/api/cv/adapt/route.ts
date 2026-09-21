export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requirePremiumAuth } from "@/lib/serverAuth";
import { normaliseContent } from "@/lib/cv/content";
import { checkRateLimit } from "@/lib/rateLimit";
import { getUserCredential, recordUsage } from "@/lib/ai/userKey";
import { isSuperAdmin } from "@/lib/permissions";
import { JD_MAX, runTailor } from "@/lib/cv/ai/adapt";
import { aiConfigured } from "@/lib/cv/ai/provider";

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
  const auth = await requirePremiumAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = checkRateLimit({
    key: `cv-adapt:${auth.id}`,
    limit: ADAPT_LIMIT,
    windowMs: ADAPT_WINDOW_MS,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "You have used all your AI tailoring runs for this hour. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

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

  const superadmin = isSuperAdmin(auth.role);
  const userKey = await getUserCredential(auth.id);
  if (!aiConfigured({ superadmin, userKey })) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  const result = await runTailor(content, jobDescription, {
    superadmin,
    userKey,
    onUsage: (usage, outcome) => { void recordUsage(auth.id, usage, outcome); },
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: STATUS[result.kind] ?? 500 });
  }

  return NextResponse.json({ ...result.value, provider: result.provider, providerLabel: result.providerLabel });
}

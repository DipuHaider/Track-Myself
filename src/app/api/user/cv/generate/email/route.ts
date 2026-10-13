export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { getUserCredential } from "@/lib/ai/userKey";
import { aiEntitlement, type Actor } from "@/lib/ai/gateway";
import { isTooThinToPrint, resolveGenerationContent } from "@/lib/cv/generatePipeline";
import { CORRECTION_MAX } from "@/lib/cv/ai/adapt";
import { writeApplicationEmail } from "@/lib/cv/applicationEmail";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { badRequest, tooMany } from "@/lib/api/respond";
import type { AppInfo } from "@/lib/cv/docx";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const appInfo = body.appInfo as AppInfo | undefined;
  if (!appInfo?.companyName || !appInfo?.jobTitle) return badRequest("The application needs a company and a job title.");
  const correction = String(body.correction ?? "").slice(0, CORRECTION_MAX);

  const gate = await checkRateLimitDb({ key: `app-email:user:${auth.id}`, limit: 15, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "You can write fifteen application emails an hour.");

  const resolved = await resolveGenerationContent(auth, body);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  const content = resolved.content;
  if (isTooThinToPrint(content)) {
    return NextResponse.json(
      { error: "There is not enough in your CV to write from. Add your name, experience and skills first." },
      { status: 400 },
    );
  }

  const userKey = await getUserCredential(auth.id);
  const actor: Actor = { kind: "user", id: auth.id, role: auth.role, plan: auth.plan, status: auth.status };
  const ent = await aiEntitlement(actor, "application.email", userKey);
  const written = await writeApplicationEmail({ content, info: appInfo, actor, userKey, correction, useAi: ent.allowed });

  return NextResponse.json({
    ...written.email,
    mode: written.mode,
    note: ent.allowed
      ? [ent.note, written.note].filter(Boolean).join(" ")
      : `${ent.message} Drafted from your CV and the posting's keywords instead.`,
    upgrade: !ent.allowed && ent.reason === "upgrade",
  });
}

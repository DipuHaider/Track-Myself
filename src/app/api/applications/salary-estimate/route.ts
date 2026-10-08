export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireActiveAuth } from "@/lib/serverAuth";
import { isPremiumUser, isSuperAdmin } from "@/lib/permissions";
import { getUserCredential } from "@/lib/ai/userKey";
import { resolveGenerationContent } from "@/lib/cv/generatePipeline";
import { normaliseContent } from "@/lib/cv/content";
import { estimateSalary } from "@/lib/salaryEstimate";

const CURRENCIES = ["EUR", "USD", "BDT"];

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  if (!isSuperAdmin(auth.role) && !isPremiumUser(auth.role, auth.plan)) {
    return NextResponse.json({ error: "Market estimates are a Premium feature.", upgrade: true }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = (key: string, max: number) => (typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "");
  const jobTitle = text("jobTitle", 160);
  const currency = CURRENCIES.includes(text("currency", 3)) ? text("currency", 3) : "EUR";
  if (!jobTitle) return NextResponse.json({ error: "Add a job title first." }, { status: 400 });

  const resolved = await resolveGenerationContent(auth, {});
  const cv = resolved.ok ? resolved.content : normaliseContent({});

  const result = await estimateSalary({
    role: {
      jobTitle,
      companyName: text("companyName", 160),
      location: text("location", 160),
      jobDescription: text("jobDescription", 6000),
      currency,
    },
    cv,
    actor: { kind: "user", id: auth.id, role: auth.role, plan: auth.plan },
    userKey: await getUserCredential(auth.id),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ...result.estimate, providerLabel: result.providerLabel, at: new Date().toISOString() });
}

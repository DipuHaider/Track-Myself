export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loadJobHunt, requireJobHuntAuth } from "@/lib/jobs/access";
import { leadSummary } from "@/lib/jobs/leads";

export async function GET() {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const settings = await loadJobHunt(auth.id);
  return NextResponse.json(await leadSummary(auth.id, settings));
}

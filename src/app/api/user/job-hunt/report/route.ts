export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { buildDailyReport } from "@/lib/jobs/report";

export async function GET() {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const report = await buildDailyReport(auth.id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

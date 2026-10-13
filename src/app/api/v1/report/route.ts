export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authenticateToken } from "@/lib/apiTokens";
import { buildDailyReport } from "@/lib/jobs/report";

/* ?date=YYYY-MM-DD rebuilds the report as of the end of that day from the
   records as they stand now; it is not a stored snapshot. */
export async function GET(req: Request) {
  const auth = await authenticateToken(req, "report:read");
  if (auth instanceof NextResponse) return auth;
  const raw = new URL(req.url).searchParams.get("date");
  let now = new Date();
  if (raw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    const d = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 86_400_000) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    now = d;
  }
  const report = await buildDailyReport(auth.id, { now });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

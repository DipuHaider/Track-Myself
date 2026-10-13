export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authenticateToken } from "@/lib/apiTokens";
import { loadInsights } from "@/lib/jobs/insights";

export async function GET(req: Request) {
  const auth = await authenticateToken(req, "report:read");
  if (auth instanceof NextResponse) return auth;
  const days = Math.min(365, Math.max(7, Number(new URL(req.url).searchParams.get("days")) || 180));
  return NextResponse.json(await loadInsights(auth.id, days));
}

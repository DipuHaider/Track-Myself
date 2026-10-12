export const dynamic = "force-dynamic";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";

/* Vercel calls this with `Authorization: Bearer $CRON_SECRET` on the schedule
   in vercel.json. Nothing else is accepted: no session, no query string. */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

async function handle(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await runMaintenance("cron");
  return NextResponse.json(summary, { status: summary.errors.length ? 207 : 200 });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

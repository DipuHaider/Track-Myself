import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/* Vercel calls cron routes with `Authorization: Bearer $CRON_SECRET` on the
   schedule in vercel.json. Nothing else is accepted: no session, no query string. */
export function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export function cronGate(req: Request): NextResponse | null {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

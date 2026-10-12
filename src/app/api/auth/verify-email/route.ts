export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clientIp } from "@/lib/rateLimit";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { checkVerificationToken, consumeVerification } from "@/lib/emailVerification";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return NextResponse.json({ valid: await checkVerificationToken(token) });
}

export async function POST(req: Request) {
  const gate = await checkRateLimitDb({ key: `verify-email:${clientIp(req)}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  try {
    const result = await consumeVerification(token);
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "This verification link has expired. Request a new one."
          : result.reason === "used"
            ? "This verification link has already been used."
            : "This verification link is not valid.";
      return NextResponse.json({ ok: false, reason: result.reason, error: message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, email: result.email, alreadyVerified: result.alreadyVerified });
  } catch (err) {
    console.error("[verify-email]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

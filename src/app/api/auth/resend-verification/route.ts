export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { forgotPasswordSchema } from "@/schemas/passwordResetSchema";
import { clientIp } from "@/lib/rateLimit";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { issueVerification } from "@/lib/emailVerification";

const ACCEPTED = { ok: true, message: "If that address needs verifying, a new link is on its way." };

export async function POST(req: Request) {
  const ip = clientIp(req);
  const gate = await checkRateLimitDb({ key: `resend-verification:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const parsed = forgotPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  try {
    await dbConnect();
    const user = (await User.findOne({ email: parsed.data.email }, "name email password emailVerifiedAt").lean()) as
      | { _id: unknown; name?: string; email: string; password?: string; emailVerifiedAt?: Date | null }
      | null;

    if (!user || !user.password || user.emailVerifiedAt !== null) return NextResponse.json(ACCEPTED);

    const perAccount = await checkRateLimitDb({
      key: `resend-verification:user:${String(user._id)}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!perAccount.ok) return NextResponse.json(ACCEPTED);

    const sent = await issueVerification(user, ip);
    if (!sent.ok) {
      console.error("[resend-verification]", sent.error);
      return NextResponse.json({ error: "Could not send the email. Try again in a moment." }, { status: 502 });
    }
    return NextResponse.json(ACCEPTED);
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

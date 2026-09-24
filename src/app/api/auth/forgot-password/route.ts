export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { forgotPasswordSchema } from "@/schemas/passwordResetSchema";
import { clientIp } from "@/lib/rateLimit";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { sendPasswordResetMail } from "@/lib/mail";
import { RESET_TTL_MINUTES, createResetToken, resetUrl } from "@/lib/passwordReset";

/* Always the same answer, whether or not the address has an account. Anything
   that varies turns this route into a way to test which emails are registered. */
const ACCEPTED = { ok: true, message: "If that address has an account, a reset link is on its way." };

export async function POST(req: Request) {
  const ip = clientIp(req);

  const gate = await checkRateLimitDb({
    key: `forgot-password:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many reset requests from this address. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();

    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = (await User.findOne({ email }, "name email password status").lean()) as
      | { _id: unknown; name?: string; email?: string; password?: string; status?: string }
      | null;

    /* No password means the account signs in with Google, so there is nothing to
       reset — and no email, or the reply would reveal the account exists. */
    if (!user || !user.password || user.status === "paused") {
      return NextResponse.json(ACCEPTED);
    }

    const perAccount = await checkRateLimitDb({
      key: `forgot-password:user:${String(user._id)}`,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!perAccount.ok) return NextResponse.json(ACCEPTED);

    await PasswordResetToken.updateMany(
      { userId: user._id, usedAt: null },
      { usedAt: new Date() },
    );

    const { token, tokenHash } = createResetToken();
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      requestedIp: ip,
    });

    const mail = await sendPasswordResetMail(user.email ?? email, {
      name: user.name ?? "there",
      resetUrl: resetUrl(token),
      expiresMinutes: RESET_TTL_MINUTES,
    });

    if (!mail.ok) {
      console.error("[forgot-password]", mail.error);
      await PasswordResetToken.updateOne({ tokenHash }, { usedAt: new Date() });
      return NextResponse.json(
        { error: "Could not send the reset email. Try again in a moment." },
        { status: 502 },
      );
    }

    return NextResponse.json(ACCEPTED);
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

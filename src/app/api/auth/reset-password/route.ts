export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { resetPasswordSchema } from "@/schemas/passwordResetSchema";
import { clientIp } from "@/lib/rateLimit";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { hashResetToken } from "@/lib/passwordReset";
import { invalidateClaims } from "@/lib/auth";

type TokenRow = { _id: unknown; userId: unknown; expiresAt: Date; usedAt: Date | null };

async function findLiveToken(token: string) {
  const row = (await PasswordResetToken.findOne({
    tokenHash: hashResetToken(token),
  }).lean()) as TokenRow | null;

  if (!row || row.usedAt) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row;
}

export async function GET(req: Request) {
  await dbConnect();

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (token.length < 32) return NextResponse.json({ valid: false });

  return NextResponse.json({ valid: Boolean(await findLiveToken(token)) });
}

export async function POST(req: Request) {
  const gate = await checkRateLimitDb({
    key: `reset-password:${clientIp(req)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();

    const parsed = resetPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? "Check the form and try again";
      return NextResponse.json({ error: issue }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const row = await findLiveToken(token);
    if (!row) {
      return NextResponse.json(
        { error: "This reset link has expired or already been used. Request a new one." },
        { status: 400 },
      );
    }

    /* Claim the token before touching the password, so two submissions of the
       same link cannot both go through. */
    const claimed = await PasswordResetToken.findOneAndUpdate(
      { _id: row._id, usedAt: null },
      { usedAt: new Date() },
    );
    if (!claimed) {
      return NextResponse.json(
        { error: "This reset link has already been used. Request a new one." },
        { status: 400 },
      );
    }

    /* sessionsValidFrom logs out every device still holding an old session —
       the point of a reset is that whoever had the old password loses access. */
    const user = await User.findByIdAndUpdate(
      row.userId,
      { password: await bcrypt.hash(password, 10), sessionsValidFrom: new Date() },
      { new: true },
    );

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    invalidateClaims(user.email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

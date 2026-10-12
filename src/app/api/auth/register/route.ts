export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { registerSchema } from "@/schemas/authSchema";
import { clientIp } from "@/lib/rateLimit";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { issueVerification, verificationRequired } from "@/lib/emailVerification";
import { canMailUsers } from "@/lib/mail";

export async function POST(req: Request) {
  const gate = await checkRateLimitDb({
    key: `register:${clientIp(req)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many accounts created from this address. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  try {
    await dbConnect();

    const json = await req.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }

    const mustVerify = verificationRequired();
    if (mustVerify && !canMailUsers()) {
      return NextResponse.json(
        { error: "Sign-up email is not configured on this deployment. Contact the maintainer." },
        { status: 503 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      emailVerifiedAt: mustVerify ? null : new Date(),
    });

    if (!mustVerify) {
      console.warn("[register] no mail provider in development — account auto-verified");
      return NextResponse.json({ requiresVerification: false, email: user.email }, { status: 201 });
    }

    const sent = await issueVerification(user, clientIp(req));
    if (!sent.ok) {
      console.error("[register] verification mail failed:", sent.error);
      await User.deleteOne({ _id: user._id, emailVerifiedAt: null });
      return NextResponse.json(
        { error: "Could not send the verification email. Try again in a moment." },
        { status: 502 },
      );
    }

    return NextResponse.json({ requiresVerification: true, email: user.email }, { status: 201 });
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

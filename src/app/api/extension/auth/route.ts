export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { mintExtensionToken } from "@/lib/extensionToken";
import { accountPaused } from "@/lib/serverAuth";
import { checkRateLimitDb, clearRateLimitDb } from "@/lib/rateLimitStore";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  await dbConnect();

  const throttleKey = `login:${email.toLowerCase().trim()}`;
  const gate = await checkRateLimitDb({
    key: throttleKey,
    limit: 8,
    windowMs: 15 * 60 * 1000,
    blockMs: 15 * 60 * 1000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await clearRateLimitDb(throttleKey);

  if (user.status === "paused") return accountPaused();

  const minted = await mintExtensionToken(user);
  if (!minted) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  return NextResponse.json(minted);
}

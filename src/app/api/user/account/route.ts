export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { purgeUserData } from "@/lib/accountDeletion";
import { requireAuth } from "@/lib/serverAuth";
import { invalidateClaims } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { checkRateLimit, clearRateLimit } from "@/lib/rateLimit";

type UserDoc = { _id: unknown; password?: string; role?: string; status?: string; pausedAt?: Date };

const SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

function expireSession(res: NextResponse) {
  for (const name of SESSION_COOKIES) {
    res.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
  }
  return res;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const user = (await User.findById(auth.id, "status pausedAt googleId password").lean()) as
    | (UserDoc & { googleId?: string })
    | null;

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    status: user.status === "paused" ? "paused" : "active",
    pausedAt: user.pausedAt ?? null,
    hasPassword: Boolean(user.password),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action !== "pause" && action !== "resume") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  await dbConnect();

  const paused = action === "pause";
  await User.findByIdAndUpdate(auth.id, {
    $set: { status: paused ? "paused" : "active", pausedAt: paused ? new Date() : null },
  });
  invalidateClaims(auth.email);

  return NextResponse.json({
    status: paused ? "paused" : "active",
    message: paused
      ? "Account paused. Your data is untouched — resume whenever you are ready."
      : "Account resumed. Tracking is active again.",
  });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = checkRateLimit({
    key: `account-delete:${auth.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in an hour." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  if (isSuperAdmin(auth.role)) {
    return NextResponse.json(
      { error: "Superadmin accounts cannot be deleted from here — it would lock the platform." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const confirm = String(body.confirm ?? "");
  const password = typeof body.password === "string" ? body.password : "";

  if (confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Type DELETE to confirm you want to erase this account.' },
      { status: 400 },
    );
  }

  await dbConnect();

  const user = (await User.findById(auth.id, "password role").lean()) as UserDoc | null;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.password) {
    if (!password) {
      return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json({ error: "That password is not correct." }, { status: 400 });
    }
  }

  clearRateLimit(`account-delete:${auth.id}`);

  const removed = await purgeUserData(auth.id, auth.email);

  return expireSession(NextResponse.json({ deleted: true, removed }));
}

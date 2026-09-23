export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { invalidateClaims } from "@/lib/auth";
import { requireActiveAuth } from "@/lib/serverAuth";
import { profileUpdateSchema } from "@/schemas/profileSchema";
import { checkRateLimit, clearRateLimit } from "@/lib/rateLimit";

export async function GET() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const user = await User.findById(auth.id, "-password").lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "Check the form and try again";
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { name, bio, currentPassword, newPassword } = parsed.data;

  await dbConnect();

  const update: Record<string, string | Date> = {};
  if (name) update.name = name;
  if (typeof bio === "string") update.bio = bio;

  if (newPassword) {
    /* The current-password check is a guess against a secret, so it needs the
       same throttle the sign-in paths get. */
    const gate = checkRateLimit({
      key: `profile-password:${auth.id}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!gate.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
      );
    }

    const user = (await User.findById(auth.id, "password").lean()) as { password?: string } | null;
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    /* Google accounts have no hash at all. bcrypt.compare throws on undefined,
       which used to surface as a 500 instead of something the user can act on. */
    if (!user.password) {
      return NextResponse.json(
        { error: "This account signs in with Google, so it has no password to change." },
        { status: 400 },
      );
    }

    const match = await bcrypt.compare(currentPassword ?? "", user.password);
    if (!match) {
      return NextResponse.json({ error: "That password is not correct." }, { status: 400 });
    }

    clearRateLimit(`profile-password:${auth.id}`);
    update.password = await bcrypt.hash(newPassword, 10);
    update.sessionsValidFrom = new Date();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await User.findByIdAndUpdate(auth.id, update, { new: true, select: "-password" });
  if (update.sessionsValidFrom) invalidateClaims(updated?.email);

  return NextResponse.json(updated);
}

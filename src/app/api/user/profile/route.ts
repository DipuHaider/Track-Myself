export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { invalidateClaims } from "@/lib/auth";
import { requireAuth } from "@/lib/serverAuth";
import { USER_PROFILE_SELECT, profileView } from "@/lib/serialisers/user";
import { profileUpdateSchema } from "@/schemas/profileSchema";
import { checkRateLimitDb, clearRateLimitDb } from "@/lib/rateLimitStore";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const user = (await User.findById(auth.id, USER_PROFILE_SELECT).lean()) as Record<string, unknown> | null;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(profileView(user));
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "Check the form and try again";
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { name, bio, image, notifPrefs, currentPassword, newPassword } = parsed.data;

  await dbConnect();

  const existing = (await User.findById(auth.id, "password").lean()) as { password?: string } | null;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hadPassword = Boolean(existing.password);
  const update: Record<string, string | Date | Record<string, boolean>> = {};
  if (name) update.name = name;
  if (typeof bio === "string") update.bio = bio;
  if (typeof image === "string") update.image = image;
  if (notifPrefs) update.notifPrefs = notifPrefs;

  if (newPassword) {
    /* The current-password check is a guess against a secret, so it needs the
       same throttle the sign-in paths get. */
    const gate = await checkRateLimitDb({
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

    /* A Google account has no hash to prove against, so adding its first
       password only needs the signed-in session. Replacing one still does. */
    if (!hadPassword) {
      return NextResponse.json(
        {
          error: "This account signs in with Google. Use “Forgot password” to set one — the emailed link proves it is really you.",
          code: "use-reset",
        },
        { status: 400 },
      );
    }
    {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required." }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, existing.password as string);
      if (!match) {
        return NextResponse.json({ error: "That password is not correct." }, { status: 400 });
      }
      /* Replacing a credential retires every session that used the old one.
         Adding a first password revokes nothing, so it must not sign the user
         out of the session they are setting it from. */
      update.sessionsValidFrom = new Date();
    }

    await clearRateLimitDb(`profile-password:${auth.id}`);
    update.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await User.findByIdAndUpdate(auth.id, update, { new: true, select: USER_PROFILE_SELECT });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (update.sessionsValidFrom) invalidateClaims(updated.email);

  return NextResponse.json(profileView(updated.toObject()));
}

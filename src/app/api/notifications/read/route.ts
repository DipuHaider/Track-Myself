export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { deriveNotifications } from "@/lib/notifications/derive";
import { SEEN_CAP } from "@/lib/notifications/types";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  const now = new Date();

  if (body?.all) {
    const derived = await deriveNotifications(auth.id);
    await Promise.all([
      Notification.updateMany({ userId: auth.id, readAt: null }, { readAt: now }),
      User.findByIdAndUpdate(auth.id, {
        $addToSet: { notifSeen: { $each: derived.map((d) => d.id).slice(0, SEEN_CAP) } },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === "string") : [];
  if (!ids.length) return NextResponse.json({ error: "Nothing to mark" }, { status: 400 });

  const derivedKeys = ids.filter((id) => id.includes(":"));
  const storedIds = ids.filter((id) => !id.includes(":"));

  await Promise.all([
    storedIds.length
      ? Notification.updateMany({ _id: { $in: storedIds }, userId: auth.id }, { readAt: now })
      : null,
    derivedKeys.length
      ? User.findByIdAndUpdate(auth.id, { $addToSet: { notifSeen: { $each: derivedKeys } } })
      : null,
  ]);

  return NextResponse.json({ ok: true });
}

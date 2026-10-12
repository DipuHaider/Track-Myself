export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { deriveNotifications, isMuted, loadNotificationPrefs } from "@/lib/notifications/derive";
import { SEEN_CAP } from "@/lib/notifications/types";
import type { NotificationItem, NotificationType } from "@/lib/notifications/types";
import { parseObjectId } from "@/lib/objectId";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const [stored, user, derived, prefs] = await Promise.all([
    Notification.find({ userId: auth.id }).sort({ createdAt: -1 }).limit(60).lean() as Promise<
      {
        _id: { toString(): string };
        type: NotificationType;
        title: string;
        body: string;
        href: string;
        readAt: Date | null;
        createdAt: Date;
      }[]
    >,
    User.findById(auth.id, "notifSeen notifDismissed").lean() as Promise<{ notifSeen?: string[]; notifDismissed?: string[] } | null>,
    deriveNotifications(auth.id),
    loadNotificationPrefs(auth.id),
  ]);

  const seen = new Set(user?.notifSeen ?? []);
  const dismissed = new Set(user?.notifDismissed ?? []);

  const items: NotificationItem[] = [
    ...stored.map((n) => ({
      id: n._id.toString(),
      kind: "stored" as const,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      createdAt: new Date(n.createdAt).toISOString(),
      read: Boolean(n.readAt),
    })),
    ...derived
      .filter((d) => !dismissed.has(d.id))
      .map((d) => ({ ...d, read: seen.has(d.id) })),
  ]
    .filter((i) => !isMuted(prefs, i.type))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({
    items,
    unread: items.filter((i) => !i.read).length,
  });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (id.includes(":")) {
    await User.findByIdAndUpdate(auth.id, {
      $push: { notifDismissed: { $each: [id.slice(0, 120)], $slice: -SEEN_CAP } },
    });
  } else {
    if (!parseObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await Notification.findOneAndDelete({ _id: id, userId: auth.id });
  }

  return NextResponse.json({ ok: true });
}

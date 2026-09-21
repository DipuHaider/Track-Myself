export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { deriveNotifications } from "@/lib/notifications/derive";
import type { NotificationItem, NotificationType } from "@/lib/notifications/types";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const [stored, user, derived] = await Promise.all([
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
    User.findById(auth.id, "notifSeen").lean() as Promise<{ notifSeen?: string[] } | null>,
    deriveNotifications(auth.id),
  ]);

  const seen = new Set(user?.notifSeen ?? []);

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
    ...derived.map((d) => ({ ...d, read: seen.has(d.id) })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

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
    await User.findByIdAndUpdate(auth.id, { $addToSet: { notifSeen: id } });
  } else {
    await Notification.findOneAndDelete({ _id: id, userId: auth.id });
  }

  return NextResponse.json({ ok: true });
}

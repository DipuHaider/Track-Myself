import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { BACKEND_ROLES } from "@/lib/permissions";
import type { NotificationType } from "@/lib/notifications/types";

type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
};

export async function notify(input: NewNotification) {
  try {
    await dbConnect();
    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: (input.body ?? "").slice(0, 600),
      href: input.href ?? "",
    });
  } catch {
    /* A notification must never break the action that triggered it. */
  }
}

export async function notifyBackendTeam(
  input: Omit<NewNotification, "userId">,
  exceptUserId?: string,
) {
  try {
    await dbConnect();
    const team = (await User.find({ role: { $in: BACKEND_ROLES } }, "_id").lean()) as {
      _id: { toString(): string };
    }[];

    const rows = team
      .map((u) => u._id.toString())
      .filter((id) => id !== exceptUserId)
      .map((id) => ({
        userId: id,
        type: input.type,
        title: input.title.slice(0, 200),
        body: (input.body ?? "").slice(0, 600),
        href: input.href ?? "",
      }));

    if (rows.length) await Notification.insertMany(rows);
  } catch {
    /* Same: never break the caller. */
  }
}

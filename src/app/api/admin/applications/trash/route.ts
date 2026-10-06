export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";
import { TRASH_DAYS, listDeletedApplications } from "@/lib/applicationTrash";

type UserRow = { _id: unknown; name: string; email: string };

export async function GET() {
  const auth = await requireAction("delete:applications");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const items = await listDeletedApplications();
  const ownerIds = [...new Set(items.map((i) => i.userId))];
  const owners = (await User.find({ _id: { $in: ownerIds } }, "name email").lean()) as unknown as UserRow[];
  const byId = new Map(owners.map((u) => [String(u._id), u]));

  return NextResponse.json({
    days: TRASH_DAYS,
    items: items.map((i) => {
      const owner = byId.get(i.userId);
      return { ...i, owner: owner ? { _id: String(owner._id), name: owner.name, email: owner.email } : null };
    }),
  });
}

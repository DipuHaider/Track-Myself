export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";
import { deleteApplicationsForever, restoreApplication } from "@/lib/applicationTrash";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const auth = await requireAction("delete:applications");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const restored = await restoreApplication({ _id: id });
  if (!restored) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const app = restored.toObject() as Record<string, unknown>;
  const owner = (await User.findById(app.userId, "name email role plan").lean()) as
    | { _id: unknown; name: string; email: string; role: string; plan: string }
    | null;

  return NextResponse.json({
    ...app,
    _id: String(app._id),
    userId: String(app.userId),
    owner: owner
      ? { _id: String(owner._id), name: owner.name, email: owner.email, role: owner.role, plan: owner.plan }
      : null,
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireAction("delete:applications");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const removed = await deleteApplicationsForever({ _id: id });
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

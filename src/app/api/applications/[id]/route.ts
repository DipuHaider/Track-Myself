export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import Interview from "@/models/Interview";
import Reminder from "@/models/Reminder";
import { authOptions } from "@/lib/auth";
import { requireActiveAuth } from "@/lib/serverAuth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const session = await getServerSession(authOptions as any);
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(application);
}

export async function PUT(req: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("$")) continue;
    if (["_id", "userId", "createdAt", "updatedAt"].includes(key)) continue;
    update[key] = value;
  }

  const updated = await Application.findOneAndUpdate(
    { _id: id, userId },
    update,
    { new: true },
  );

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const { id } = await params;
  const deleted = await Application.findOneAndDelete({ _id: id, userId });
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Promise.all([
    Interview.deleteMany({ applicationId: id }),
    Reminder.deleteMany({ applicationId: id }),
  ]);

  return NextResponse.json({ success: true });
}

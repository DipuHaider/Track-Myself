export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { requireActiveAuth } from "@/lib/serverAuth";
import { deleteApplicationsForever, restoreApplication } from "@/lib/applicationTrash";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const restored = await restoreApplication({ _id: id, userId: auth.id });
  if (!restored) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(restored);
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const removed = await deleteApplicationsForever({ _id: id, userId: auth.id });
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

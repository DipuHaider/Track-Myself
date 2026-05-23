export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await dbConnect();

  const existing = await CVProfile.findOne({ userId: auth.id }, { mainFileId: 1 }).lean();
  const newMain = (existing as any)?.mainFileId === id ? "" : id;

  await CVProfile.updateOne(
    { userId: auth.id },
    { $set: { mainFileId: newMain } },
  );
  return NextResponse.json({ mainFileId: newMain });
}

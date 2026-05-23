export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await dbConnect();

  const profile = await CVProfile.findOne({ userId: auth.id }).lean() as any;
  const file = profile?.uploadedFiles?.find(
    (f: any) => f._id?.toString() === id,
  );
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!file.data) return NextResponse.json({ error: "File data missing" }, { status: 404 });

  return NextResponse.json({ name: file.name, mimeType: file.mimeType, data: file.data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await dbConnect();

  const existing = await CVProfile.findOne({ userId: auth.id }, { mainFileId: 1 }).lean() as any;
  const update: Record<string, unknown> = { $pull: { uploadedFiles: { _id: id } } };
  if (existing?.mainFileId === id) update.$set = { mainFileId: "" };

  await CVProfile.updateOne({ userId: auth.id }, update);
  return NextResponse.json({ ok: true });
}

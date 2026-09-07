export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import { migrateLegacyCVFiles } from "@/lib/cvFiles";
import type { CVPrimaryFiles } from "@/types/cv";

const PRIMARY_KEYS: (keyof CVPrimaryFiles)[] = [
  "cv", "resume", "coverLetter", "profilePhoto", "coverImage",
];

type FileDoc = { name: string; mimeType: string; category?: string; data?: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await dbConnect();
  await migrateLegacyCVFiles(auth.id);

  const file = (await CVFile.findOne(
    { _id: id, userId: auth.id },
    { name: 1, mimeType: 1, category: 1, data: 1 },
  ).lean()) as FileDoc | null;

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!file.data) return NextResponse.json({ error: "File data missing" }, { status: 404 });

  return NextResponse.json({
    name: file.name,
    mimeType: file.mimeType,
    category: file.category ?? "other",
    data: file.data,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "A name is required" }, { status: 400 });

  const updated = await CVFile.findOneAndUpdate(
    { _id: id, userId: auth.id },
    { $set: { name: name.slice(0, 160) } },
    { new: true, projection: { data: 0 } },
  ).lean();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await dbConnect();

  const deleted = await CVFile.deleteOne({ _id: id, userId: auth.id });
  if (!deleted.deletedCount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unset: Record<string, string> = {};
  for (const key of PRIMARY_KEYS) unset[`primary.${key}`] = "";

  const profile = await CVProfile.findOne({ userId: auth.id }, { primary: 1, mainFileId: 1 }).lean() as
    | { primary?: Record<string, string>; mainFileId?: string }
    | null;

  const set: Record<string, string> = {};
  for (const key of PRIMARY_KEYS) {
    if (profile?.primary?.[key] === id) set[`primary.${key}`] = "";
  }
  if (profile?.mainFileId === id) set.mainFileId = "";

  if (Object.keys(set).length) {
    await CVProfile.updateOne({ userId: auth.id }, { $set: set });
  }

  return NextResponse.json({ ok: true });
}

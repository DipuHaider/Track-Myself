export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import { PRIMARY_FOR_CATEGORY, migrateLegacyCVFiles } from "@/lib/cvFiles";
import type { CVFileCategory } from "@/types/cv";

type ProfilePrimary = { primary?: Record<string, string>; mainFileId?: string };

export async function PATCH(
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
    { category: 1 },
  ).lean()) as { category?: CVFileCategory } | null;

  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slot = PRIMARY_FOR_CATEGORY[file.category ?? "other"];
  if (!slot) {
    return NextResponse.json(
      { error: "Files in this section cannot be marked as primary." },
      { status: 400 },
    );
  }

  const existing = (await CVProfile.findOne(
    { userId: auth.id },
    { primary: 1, mainFileId: 1 },
  ).lean()) as ProfilePrimary | null;

  const current = existing?.primary?.[slot] ?? (slot === "cv" ? existing?.mainFileId : "") ?? "";
  const next = current === id ? "" : id;

  const set: Record<string, string> = { [`primary.${slot}`]: next };
  if (slot === "cv") set.mainFileId = next;

  await CVProfile.updateOne(
    { userId: auth.id },
    { $set: set, $setOnInsert: { userId: auth.id } },
    { upsert: true },
  );

  return NextResponse.json({ slot, value: next, mainFileId: slot === "cv" ? next : undefined });
}

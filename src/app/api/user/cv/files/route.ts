export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import {
  CATEGORY_MAX_BYTES, CATEGORY_MIME, PRIMARY_FOR_CATEGORY,
  listCVFiles, migrateLegacyCVFiles,
} from "@/lib/cvFiles";
import { CV_FILE_CATEGORIES, type CVFileCategory } from "@/types/cv";

const MAX_FILES = 40;

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  return NextResponse.json(await listCVFiles(auth.id));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json();
  const { name, size, mimeType, data } = body as {
    name: string;
    size: number;
    mimeType: string;
    data: string;
  };
  const category = (body.category ?? "other") as CVFileCategory;

  if (!name || !mimeType || !data) {
    return NextResponse.json({ error: "name, mimeType and data are required" }, { status: 400 });
  }
  if (!CV_FILE_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Unknown document category" }, { status: 400 });
  }
  if (!CATEGORY_MIME[category].includes(mimeType)) {
    return NextResponse.json(
      { error: `That file type is not accepted for this section.` },
      { status: 400 },
    );
  }
  if (size > CATEGORY_MAX_BYTES[category]) {
    const mb = Math.round(CATEGORY_MAX_BYTES[category] / (1024 * 1024));
    return NextResponse.json({ error: `File must be under ${mb} MB` }, { status: 400 });
  }

  await migrateLegacyCVFiles(auth.id);

  /* Documents this app generated do not eat into the user's upload allowance. */
  const count = await CVFile.countDocuments({ userId: auth.id, generated: { $ne: true } });
  if (count >= MAX_FILES) {
    return NextResponse.json(
      { error: `You can store up to ${MAX_FILES} files. Delete one to upload another.` },
      { status: 400 },
    );
  }

  const created = await CVFile.create({ userId: auth.id, category, name, size, mimeType, data });

  const primaryKey = PRIMARY_FOR_CATEGORY[category];
  const set: Record<string, unknown> = {};

  if (primaryKey) {
    const existing = await CVProfile.findOne({ userId: auth.id }, { primary: 1 }).lean() as
      | { primary?: Record<string, string> }
      | null;
    const alreadySet = existing?.primary?.[primaryKey];
    const isSingleSlot = category === "profile-photo" || category === "cover-image";

    if (!alreadySet || isSingleSlot) {
      set[`primary.${primaryKey}`] = String(created._id);
      if (primaryKey === "cv") set.mainFileId = String(created._id);
    }
  }

  await CVProfile.updateOne(
    { userId: auth.id },
    { $set: set, $setOnInsert: { userId: auth.id } },
    { upsert: true },
  );

  return NextResponse.json(await listCVFiles(auth.id), { status: 201 });
}

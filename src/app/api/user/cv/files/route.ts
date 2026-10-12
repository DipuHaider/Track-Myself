export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import {
  CATEGORY_MAX_BYTES, CATEGORY_MIME, PRIMARY_FOR_CATEGORY,
  listCVFiles, migrateLegacyCVFiles, resolveFileMime,
} from "@/lib/cvFiles";
import { CV_FILE_CATEGORIES, type CVFileCategory } from "@/types/cv";
import { base64Bytes } from "@/lib/cvFileTypes";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";

const MAX_FILES = 40;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  return NextResponse.json(await listCVFiles(auth.id));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `cv-files:user:${auth.id}`, limit: 30, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "Too many uploads this hour.");

  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const { mimeType, data } = body as { mimeType: string; data: string };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  if (typeof data !== "string" || !BASE64.test(data)) {
    return NextResponse.json({ error: "File data must be base64." }, { status: 400 });
  }
  const size = base64Bytes(data);
  const category = (body.category ?? "other") as CVFileCategory;

  if (!name || !mimeType || !data) {
    return NextResponse.json({ error: "name, mimeType and data are required" }, { status: 400 });
  }
  if (!CV_FILE_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Unknown document category" }, { status: 400 });
  }
  /* The browser’s type for .md and .json cannot be trusted, so the name decides. */
  const mime = resolveFileMime(name, mimeType);

  if (!CATEGORY_MIME[category].includes(mime)) {
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

  const created = await CVFile.create({ userId: auth.id, category, name, size, mimeType: mime, data });

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

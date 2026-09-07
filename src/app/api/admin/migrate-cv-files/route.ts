export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireSuperAdminAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";

type LegacyFile = {
  _id: unknown;
  name: string;
  size: number;
  mimeType: string;
  data: string;
  uploadedAt?: Date;
};

type LegacyProfile = { _id: unknown; userId: string; uploadedFiles?: LegacyFile[] };

async function runMigration() {
  await dbConnect();

  const profiles = (await CVProfile.find(
    { "uploadedFiles.0": { $exists: true } },
    { userId: 1, uploadedFiles: 1 },
  ).lean()) as unknown as LegacyProfile[];

  let movedFiles = 0;
  let skippedExisting = 0;

  for (const profile of profiles) {
    for (const file of profile.uploadedFiles ?? []) {
      const exists = await CVFile.exists({ _id: file._id });
      if (exists) {
        skippedExisting++;
        continue;
      }
      await CVFile.create({
        _id: file._id,
        userId: profile.userId,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        data: file.data,
        uploadedAt: file.uploadedAt ?? new Date(),
      });
      movedFiles++;
    }
    await CVProfile.updateOne({ _id: profile._id }, { $set: { uploadedFiles: [] } });
  }

  return { profilesProcessed: profiles.length, movedFiles, skippedExisting };
}

export async function GET() {
  const auth = await requireSuperAdminAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await runMigration());
}

export async function POST() {
  const auth = await requireSuperAdminAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await runMigration());
}

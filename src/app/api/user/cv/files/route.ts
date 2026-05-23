export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const cv = await CVProfile.findOne({ userId: auth.id }, { "uploadedFiles.data": 0 }).lean();
  return NextResponse.json((cv as any)?.uploadedFiles ?? []);
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

  if (!name || !mimeType || !data) {
    return NextResponse.json({ error: "name, mimeType and data are required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Only PDF, DOC and DOCX files are accepted" }, { status: 400 });
  }
  if (size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  const cv = await CVProfile.findOneAndUpdate(
    { userId: auth.id },
    { $push: { uploadedFiles: { name, size, mimeType, data } }, $setOnInsert: { userId: auth.id } },
    { upsert: true, new: true, projection: { "uploadedFiles.data": 0 } },
  ).lean();

  return NextResponse.json((cv as any).uploadedFiles ?? [], { status: 201 });
}

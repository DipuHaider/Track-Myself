export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DocumentModel from "@/models/Document";
import { requireActiveAuth } from "@/lib/serverAuth";
import { attachmentUrl } from "@/lib/attachments";

/* Base64 inflates by a third, so this ceiling keeps a stored row well inside
   MongoDB's 16 MB document limit. */
const MAX_SIZE = 8 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds the 8 MB limit" }, { status: 400 });
    }
    if (!ALLOWED[file.type]) {
      return NextResponse.json(
        { error: "Only PDF, DOC, DOCX, PNG, JPG and WebP files are accepted" },
        { status: 400 },
      );
    }

    const safeName =
      file.name.replace(/[/\]/g, "-").replace(/[\u0000-\u001f]/g, "").slice(0, 120) || "file";

    await dbConnect();

    const bytes = Buffer.from(await file.arrayBuffer());
    const doc = await DocumentModel.create({
      userId: auth.id,
      type: "attachment",
      name: safeName,
      size: file.size,
      mimeType: file.type,
      data: bytes.toString("base64"),
    });

    return NextResponse.json({
      path: attachmentUrl(String(doc._id), safeName),
      name: safeName,
      size: file.size,
    });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

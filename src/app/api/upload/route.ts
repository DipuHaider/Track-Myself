export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DocumentModel from "@/models/Document";
import { requireActiveAuth } from "@/lib/serverAuth";
import { attachmentUrl } from "@/lib/attachments";
import { declaredMatchesBytes } from "@/lib/fileSniff";
import { parseObjectId } from "@/lib/objectId";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import Application from "@/models/Application";

/* Vercel refuses request bodies over ~4.5 MB before the route runs, so the
   advertised cap has to sit under that; base64 then keeps a row well inside
   MongoDB's 16 MB document limit. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_USER = 100;
const MAX_BYTES_PER_USER = 100 * 1024 * 1024;

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

  const gate = await checkRateLimitDb({ key: `upload:user:${auth.id}`, limit: 30, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "Too many uploads this hour.");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const applicationIdRaw = formData.get("applicationId");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds the 4 MB limit" }, { status: 400 });
    }
    if (!ALLOWED[file.type]) {
      return NextResponse.json(
        { error: "Only PDF, DOC, DOCX, PNG, JPG and WebP files are accepted" },
        { status: 400 },
      );
    }

    const safeName =
      file.name.replace(/[\\/]/g, "-").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 120) || "file";

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!declaredMatchesBytes(file.type, bytes)) {
      return NextResponse.json({ error: "The file's contents do not match its type." }, { status: 400 });
    }

    await dbConnect();

    const [count, totals] = await Promise.all([
      DocumentModel.countDocuments({ userId: auth.id }),
      DocumentModel.aggregate<{ bytes: number }>([
        { $match: { userId: parseObjectId(auth.id) } },
        { $group: { _id: null, bytes: { $sum: "$size" } } },
      ]),
    ]);
    const used = totals[0]?.bytes ?? 0;
    if (count >= MAX_FILES_PER_USER || used + file.size > MAX_BYTES_PER_USER) {
      return NextResponse.json(
        { error: "Attachment storage is full. Delete some attachments to upload more." },
        { status: 400 },
      );
    }

    let applicationId: ReturnType<typeof parseObjectId> = null;
    if (typeof applicationIdRaw === "string" && applicationIdRaw) {
      applicationId = parseObjectId(applicationIdRaw);
      if (!applicationId || !(await Application.exists({ _id: applicationId, userId: auth.id }))) {
        return NextResponse.json({ error: "Unknown application." }, { status: 400 });
      }
    }

    const doc = await DocumentModel.create({
      userId: auth.id,
      applicationId,
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

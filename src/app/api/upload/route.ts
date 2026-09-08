export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireActiveAuth } from "@/lib/serverAuth";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file

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
    const companyName = (formData.get("companyName") as string | null) ?? "unknown";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File exceeds 10 MB limit` }, { status: 400 });
    }

    const safeExt = ALLOWED[file.type];
    if (!safeExt) {
      return NextResponse.json(
        { error: "Only PDF, DOC, DOCX, PNG, JPG and WebP files are accepted" },
        { status: 400 },
      );
    }

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const safeCompany = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown";

    const baseName = path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 40) || "file";

    const fileName = `${safeCompany}-${baseName}-${Date.now()}.${safeExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", year, month, day);

    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

    const publicPath = `/uploads/${year}/${month}/${day}/${fileName}`;
    return NextResponse.json({ path: publicPath, name: file.name, size: file.size });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

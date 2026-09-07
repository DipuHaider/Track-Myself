export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import { readCVFile } from "@/lib/cvFiles";

export async function GET(
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

  const file = await readCVFile(auth.id, id);
  if (!file?.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  const bytes = Buffer.from(file.data, "base64");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

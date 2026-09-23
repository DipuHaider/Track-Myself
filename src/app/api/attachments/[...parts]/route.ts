export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DocumentModel from "@/models/Document";
import { requireActiveAuth } from "@/lib/serverAuth";

type Row = { name?: string; mimeType?: string; data?: string };

export async function GET(_: Request, { params }: { params: Promise<{ parts: string[] }> }) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const { parts } = await params;
  const id = parts?.[0] ?? "";
  if (!/^[0-9a-f]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  /* Scoped to the owner: an attachment id is guessable enough that it must not
     be the only thing standing between accounts. */
  const row = (await DocumentModel.findOne(
    { _id: id, userId: auth.id },
    "name mimeType data",
  ).lean()) as Row | null;

  if (!row?.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bytes = Buffer.from(row.data, "base64");
  const name = (row.name ?? "file").replace(/"/g, "");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.mimeType || "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

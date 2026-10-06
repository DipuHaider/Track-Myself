export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { requireActiveAuth } from "@/lib/serverAuth";
import { DOCUMENT_FORMATS, PROVIDED_DOCUMENTS } from "@/constants/applicationStatus";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { name?: string; format?: string };
  const name = PROVIDED_DOCUMENTS.find((d) => d === body.name);
  const format = DOCUMENT_FORMATS.find((f) => f === body.format);
  if (!name || !format) return NextResponse.json({ error: "Unknown document or format" }, { status: 400 });

  const app = (await Application.findOne({ _id: id, userId: auth.id }, "providedDocuments").lean()) as
    | { providedDocuments?: { name: string; format?: string }[] }
    | null;
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const providedDocuments = [
    ...(app.providedDocuments ?? []).filter((d) => d.name !== name),
    { name, format },
  ];
  await Application.updateOne(
    { _id: id, userId: auth.id },
    { $set: { providedDocuments } },
    { runValidators: true },
  );
  return NextResponse.json({ providedDocuments });
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { historyActor, isValidationError, updateApplication, validationMessage } from "@/lib/applicationHistory";
import { softDeleteApplication } from "@/lib/applicationTrash";
import { requireAction } from "@/lib/serverAuth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAction("edit:applications");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  const body = await req.json();

  let updated;
  try {
    updated = await updateApplication({ _id: id }, body, () => historyActor(auth.id));
  } catch (err) {
    if (isValidationError(err)) return NextResponse.json({ error: validationMessage(err) }, { status: 400 });
    throw err;
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAction("delete:applications");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await dbConnect();

  const deleted = await softDeleteApplication({ _id: id }, await historyActor(auth.id));
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, deletedAt: deleted.deletedAt });
}

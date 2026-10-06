export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { historyActor, isValidationError, updateApplication, validationMessage } from "@/lib/applicationHistory";
import { softDeleteApplication } from "@/lib/applicationTrash";
import { requireActiveAuth } from "@/lib/serverAuth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const { id } = await params;
  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(application);
}

export async function PUT(req: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const { id } = await params;
  const body = await req.json();
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updated;
  try {
    updated = await updateApplication({ _id: id, userId }, body, () => historyActor(userId));
  } catch (err) {
    if (isValidationError(err)) return NextResponse.json({ error: validationMessage(err) }, { status: 400 });
    throw err;
  }

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;
  const userId = auth.id;

  await dbConnect();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deleted = await softDeleteApplication({ _id: id, userId }, await historyActor(userId));
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, deletedAt: deleted.deletedAt });
}

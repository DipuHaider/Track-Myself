export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const update: Record<string, unknown> = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
    update.title = title.slice(0, 300);
  }
  if (typeof body?.done === "boolean") update.done = body.done;
  if (typeof body?.order === "number") update.order = body.order;
  if ("dueAt" in (body ?? {})) {
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    update.dueAt = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null;
  }

  const todo = await Todo.findOneAndUpdate({ _id: id, userId: auth.id }, update, { new: true });
  if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(todo);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const { id } = await params;
  const removed = await Todo.findOneAndDelete({ _id: id, userId: auth.id });
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const todos = await Todo.find({ userId: auth.id })
    .sort({ done: 1, order: 1, createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json(todos);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
  if (title.length > 300) return NextResponse.json({ error: "Title is too long" }, { status: 400 });

  const count = await Todo.countDocuments({ userId: auth.id });
  if (count >= 200) {
    return NextResponse.json({ error: "You have reached the 200 to-do limit" }, { status: 400 });
  }

  const dueAt = body?.dueAt ? new Date(body.dueAt) : null;
  const todo = await Todo.create({
    userId: auth.id,
    title,
    dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    order: count,
  });

  return NextResponse.json(todo, { status: 201 });
}

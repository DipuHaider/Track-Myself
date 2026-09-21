export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { normaliseA11y } from "@/lib/a11y";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const user = await User.findById(auth.id, "a11y").lean();
  return NextResponse.json(normaliseA11y((user as { a11y?: unknown } | null)?.a11y));
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  const prefs = normaliseA11y(body);

  await User.findByIdAndUpdate(auth.id, { a11y: prefs });
  return NextResponse.json(prefs);
}

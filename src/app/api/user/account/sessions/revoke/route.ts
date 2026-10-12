export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireAuth } from "@/lib/serverAuth";
import { invalidateClaims } from "@/lib/auth";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  await User.updateOne({ _id: auth.id }, { $set: { sessionsValidFrom: new Date() } });
  invalidateClaims(auth.email);

  return NextResponse.json({ ok: true, message: "Every session has been signed out, including this one." });
}

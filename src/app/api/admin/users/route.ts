export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireEditorAuth } from "@/lib/serverAuth";

export async function GET() {
  const auth = await requireEditorAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const users = await User.find({}, "-password").sort({ createdAt: -1 }).lean();
  return NextResponse.json(users);
}

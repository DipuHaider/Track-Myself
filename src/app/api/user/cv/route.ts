export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import CVProfile from "@/models/CVProfile";

const ALLOWED_FIELDS = [
  "name", "title", "email", "phone", "location",
  "linkedin", "website", "summary", "experience",
  "education", "skills", "languages", "photo",
] as const;

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const cv = await CVProfile.findOne({ userId: auth.id }).lean();
  return NextResponse.json(cv ?? {});
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const body = await req.json();
  const data: Record<string, string> = { userId: auth.id };
  for (const k of ALLOWED_FIELDS) {
    if (typeof body[k] === "string") data[k] = body[k];
  }
  const cv = await CVProfile.findOneAndUpdate(
    { userId: auth.id },
    { $set: data },
    { upsert: true, new: true },
  ).lean();
  return NextResponse.json(cv);
}

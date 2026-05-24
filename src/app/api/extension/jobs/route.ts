export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";

async function getExtensionUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const payload = await decode({ token: auth.slice(7), secret });
    if (!payload?.id) return null;
    return { id: payload.id as string, role: (payload.role ?? "free") as string };
  } catch {
    return null;
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  const user = await getExtensionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const companyName = (body.companyName as string | undefined)?.trim() ?? "";
  const jobTitle    = (body.jobTitle    as string | undefined)?.trim() ?? "";
  if (!companyName || !jobTitle) {
    return NextResponse.json({ error: "companyName and jobTitle are required" }, { status: 400 });
  }

  await dbConnect();

  const existing = await Application.findOne({
    userId:      user.id,
    companyName: { $regex: `^${escapeRegex(companyName)}$`, $options: "i" },
    jobTitle:    { $regex: `^${escapeRegex(jobTitle)}$`,    $options: "i" },
  }).select("_id companyName jobTitle").lean();

  if (existing) {
    return NextResponse.json({ error: "duplicate", existing }, { status: 409 });
  }

  const application = await Application.create({
    userId:            user.id,
    companyName,
    jobTitle,
    location:          (body.location  as string | undefined)?.trim() ?? "",
    jobPostUrl:        (body.jobPostUrl as string | undefined)?.trim() ?? "",
    notes:             (body.notes     as string | undefined)?.trim() ?? "",
    applicationStatus: "Wishlist",
  });

  return NextResponse.json(application, { status: 201 });
}

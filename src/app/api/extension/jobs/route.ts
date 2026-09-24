export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { JOB_TYPES, PLATFORMS, WORKPLACE_TYPES } from "@/constants/applicationStatus";
import { liveStatus, sessionsRevokedBefore } from "@/lib/serverAuth";

async function getExtensionUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const payload = await decode({ token: auth.slice(7), secret });
    if (!payload?.id) return null;
    const startedAt = payload.sessionStart ?? (payload.iat ? payload.iat * 1000 : 0);
    if (await sessionsRevokedBefore(payload.id as string, startedAt)) return null;
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

  const status = await liveStatus(user.id);
  if (!status) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (status === "paused") {
    return NextResponse.json(
      { error: "Your account is paused. Resume it from your profile to save jobs.", status: "paused" },
      { status: 423 },
    );
  }

  const existing = await Application.findOne({
    userId:      user.id,
    companyName: { $regex: `^${escapeRegex(companyName)}$`, $options: "i" },
    jobTitle:    { $regex: `^${escapeRegex(jobTitle)}$`,    $options: "i" },
  }).select("_id companyName jobTitle").lean();

  if (existing) {
    return NextResponse.json({ error: "duplicate", existing }, { status: 409 });
  }

  /* The scraper guesses these from page text, so anything outside the tracker's
     own vocabulary is dropped rather than written through as a stray value. */
  const str = (key: string) => (body[key] as string | undefined)?.trim() ?? "";
  const oneOf = (value: string, allowed: readonly string[]) =>
    allowed.find((a) => a.toLowerCase() === value.toLowerCase());

  const application = await Application.create({
    userId:            user.id,
    companyName,
    jobTitle,
    location:          str("location"),
    platform:          oneOf(str("platform"), PLATFORMS),
    jobType:           oneOf(str("jobType"), JOB_TYPES),
    workplaceType:     oneOf(str("workplaceType"), WORKPLACE_TYPES),
    salary:            str("salary").slice(0, 120) || undefined,
    jobPostUrl:        str("jobPostUrl"),
    jobDescription:    str("jobDescription").slice(0, 24000) || undefined,
    notes:             str("notes"),
    applicationStatus: "Wishlist",
  });

  return NextResponse.json(application, { status: 201 });
}

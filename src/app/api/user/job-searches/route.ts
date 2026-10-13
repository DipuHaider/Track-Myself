export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobSearch from "@/models/JobSearch";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { jobSearchSchema, JOB_SEARCH_LIMIT } from "@/schemas/jobSearchSchema";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { badRequest, tooMany } from "@/lib/api/respond";

export async function GET() {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const rows = await JobSearch.find({ userId: auth.id }).sort({ createdAt: 1 }).lean();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `job-search-write:user:${auth.id}`, limit: 60, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const parsed = jobSearchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid search");

  await dbConnect();
  const count = await JobSearch.countDocuments({ userId: auth.id });
  if (count >= JOB_SEARCH_LIMIT) return badRequest(`You can keep up to ${JOB_SEARCH_LIMIT} saved searches.`);

  const row = await JobSearch.create({ ...parsed.data, userId: auth.id });
  return NextResponse.json(row.toObject(), { status: 201 });
}

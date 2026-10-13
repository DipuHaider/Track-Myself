export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import { authenticateToken } from "@/lib/apiTokens";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";
import { envelope, parsePage } from "@/lib/pagination";

const FIELDS =
  "companyName jobTitle platform applicationStatus appliedDate followUpDate deadline jobPostUrl location priority favourite leadId createdAt updatedAt";

export async function GET(req: Request) {
  const auth = await authenticateToken(req, "applications:read");
  if (auth instanceof NextResponse) return auth;
  const params = new URL(req.url).searchParams;
  const page = parsePage(params, { defaultLimit: 50, maxLimit: 200 });
  const filter: Record<string, unknown> = { userId: auth.id };
  const status = params.get("status");
  if (status && (APPLICATION_STATUSES as readonly string[]).includes(status)) filter.applicationStatus = status;

  await dbConnect();
  const [items, total] = await Promise.all([
    Application.find(filter, FIELDS).sort({ updatedAt: -1 }).skip(page.skip).limit(page.limit).lean(),
    Application.countDocuments(filter),
  ]);
  return NextResponse.json(envelope(items, total, page));
}

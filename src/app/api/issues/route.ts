export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import IssueReport from "@/models/IssueReport";
import { ISSUE_CATEGORIES, ISSUE_MESSAGE_MAX, type IssueCategory } from "@/constants/issues";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const reports = await IssueReport.find({ userId: auth.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 8) {
    return NextResponse.json({ error: "Please describe the issue in a bit more detail" }, { status: 400 });
  }

  const recent = await IssueReport.countDocuments({
    userId: auth.id,
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  });
  if (recent >= 5) {
    return NextResponse.json({ error: "Too many reports — try again in a few minutes" }, { status: 429 });
  }

  const category: IssueCategory = ISSUE_CATEGORIES.includes(body?.category)
    ? body.category
    : "Bug";

  const report = await IssueReport.create({
    userId: auth.id,
    email: auth.email ?? "",
    role: auth.role,
    category,
    message: message.slice(0, ISSUE_MESSAGE_MAX),
    url: typeof body?.url === "string" ? body.url.slice(0, 500) : "",
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 400),
    viewport: typeof body?.viewport === "string" ? body.viewport.slice(0, 40) : "",
  });

  return NextResponse.json(report, { status: 201 });
}

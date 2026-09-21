export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAction } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import IssueReport from "@/models/IssueReport";
import { ISSUE_STATUSES, type IssueStatus } from "@/constants/issues";

export async function GET(req: Request) {
  const auth = await requireAction("view:issues");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const status = new URL(req.url).searchParams.get("status");
  const filter = ISSUE_STATUSES.includes(status as IssueStatus) ? { status } : {};

  const [reports, open] = await Promise.all([
    IssueReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "name email")
      .lean(),
    IssueReport.countDocuments({ status: "open" }),
  ]);

  return NextResponse.json({ reports, open });
}

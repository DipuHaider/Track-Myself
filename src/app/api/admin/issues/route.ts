export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAction } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import IssueReport from "@/models/IssueReport";
import { ISSUE_STATUSES, type IssueCounts, type IssueStatus } from "@/constants/issues";

export async function GET(req: Request) {
  const auth = await requireAction("view:issues");
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const status = new URL(req.url).searchParams.get("status");
  const filter = ISSUE_STATUSES.includes(status as IssueStatus) ? { status } : {};

  const [reports, grouped] = await Promise.all([
    IssueReport.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "name email")
      .lean(),
    IssueReport.aggregate<{ _id: IssueStatus; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts: IssueCounts = { open: 0, triaged: 0, closed: 0, all: 0 };
  for (const row of grouped) {
    if (row._id in counts) counts[row._id] = row.count;
    counts.all += row.count;
  }

  return NextResponse.json({ reports, counts, open: counts.open });
}

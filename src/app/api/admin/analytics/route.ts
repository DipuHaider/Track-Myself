export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";

const INTERVIEW_STATUSES = APPLICATION_STATUSES.filter(
  (s) => s === "Interview Scheduled" || s.startsWith("Active"),
);

const GHOST_STATUSES = ["Wishlist", "Submitted", "No Response"];
const GHOST_DAYS = 45;
const TREND_MONTHS = 12;

type CountRow = { _id: string | null; count: number };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptyTrend() {
  const out: { month: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: monthKey(d),
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      count: 0,
    });
  }
  return out;
}

export async function GET() {
  const auth = await requireAction("view:analytics");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const trend = emptyTrend();
  const since = new Date();
  since.setMonth(since.getMonth() - (TREND_MONTHS - 1), 1);
  since.setHours(0, 0, 0, 0);

  const ghostCutoff = new Date();
  ghostCutoff.setDate(ghostCutoff.getDate() - GHOST_DAYS);

  const [
    statusRows,
    trendRows,
    companyRows,
    platformRows,
    total,
    ghostCount,
    totalUsers,
    activeUsers,
    recent,
  ] = await Promise.all([
    Application.aggregate<CountRow>([
      { $group: { _id: "$applicationStatus", count: { $sum: 1 } } },
    ]),
    Application.aggregate<CountRow>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Application.aggregate<CountRow>([
      { $group: { _id: "$companyName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Application.aggregate<CountRow>([
      { $match: { platform: { $nin: [null, ""] } } },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Application.countDocuments(),
    Application.countDocuments({
      applicationStatus: { $in: GHOST_STATUSES },
      appliedDate: { $ne: null, $lt: ghostCutoff },
    }),
    User.countDocuments(),
    Application.distinct("userId"),
    Application.find({}, "companyName jobTitle applicationStatus createdAt appliedDate")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const status of APPLICATION_STATUSES) statusCounts[status] = 0;
  for (const row of statusRows) {
    if (row._id) statusCounts[row._id] = row.count;
  }

  const byMonth = new Map(trendRows.map((r) => [r._id, r.count]));
  for (const point of trend) point.count = byMonth.get(point.month) ?? 0;

  const interviews = INTERVIEW_STATUSES.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);
  const offers = statusCounts["Offer Received"] ?? 0;
  const rejected = statusCounts["Rejected"] ?? 0;
  const wishlist = statusCounts["Wishlist"] ?? 0;
  const applied = total - wishlist;

  return NextResponse.json({
    totals: {
      applications: total,
      applied,
      interviews,
      offers,
      rejected,
      ghosts: ghostCount,
      users: totalUsers,
      activeUsers: activeUsers.length,
    },
    funnel: [
      { stage: "Tracked",    count: total },
      { stage: "Applied",    count: applied },
      { stage: "Interviews", count: interviews },
      { stage: "Offers",     count: offers },
    ],
    statusCounts,
    trend,
    topCompanies: companyRows.map((r) => ({ name: r._id ?? "Unknown", count: r.count })),
    topPlatforms: platformRows.map((r) => ({ name: r._id ?? "Unknown", count: r.count })),
    recent: recent.map((a: Record<string, unknown>) => ({
      _id: String(a._id),
      companyName: a.companyName as string,
      jobTitle: a.jobTitle as string,
      applicationStatus: a.applicationStatus as string,
      date: (a.appliedDate ?? a.createdAt) as string,
    })),
  });
}

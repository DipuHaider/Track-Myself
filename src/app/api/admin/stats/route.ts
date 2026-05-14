export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import User from "@/models/User";
import { requireEditorAuth } from "@/lib/serverAuth";

const INTERVIEW_STATUSES = [
  "Interview Scheduled",
  "Active - Written",
  "Active - HR",
  "Active - Technical",
  "Active - Cultural Fit",
];

export async function GET() {
  const auth = await requireEditorAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const [
    totalUsers,
    staffCount,
    paidCount,
    freeCount,
    totalApps,
    interviews,
    offers,
    rejected,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: { $in: ["superadmin", "admin", "editor"] } }),
    User.countDocuments({ role: "paid" }),
    User.countDocuments({ role: "free" }),
    Application.countDocuments(),
    Application.countDocuments({ applicationStatus: { $in: INTERVIEW_STATUSES } }),
    Application.countDocuments({ applicationStatus: "Offer Received" }),
    Application.countDocuments({ applicationStatus: "Rejected" }),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, staff: staffCount, paid: paidCount, free: freeCount },
    applications: { total: totalApps, interviews, offers, rejected },
  });
}

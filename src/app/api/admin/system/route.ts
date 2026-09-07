export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import CVFile from "@/models/CVFile";
import CVProfile from "@/models/CVProfile";
import User from "@/models/User";
import { requireAction } from "@/lib/serverAuth";
import { PLANS, ROLES } from "@/lib/permissions";

export async function GET() {
  const auth = await requireAction("view:settings");
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  const [roleRows, planRows, applications, profiles, files, legacyProfiles] = await Promise.all([
    User.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]),
    Application.countDocuments(),
    CVProfile.countDocuments(),
    CVFile.countDocuments(),
    CVProfile.countDocuments({ "uploadedFiles.0": { $exists: true } }),
  ]);

  const byRole: Record<string, number> = {};
  for (const role of ROLES) byRole[role] = 0;
  for (const row of roleRows) if (row._id) byRole[row._id] = row.count;

  const byPlan: Record<string, number> = {};
  for (const plan of PLANS) byPlan[plan] = 0;
  for (const row of planRows) if (row._id) byPlan[row._id] = row.count;

  return NextResponse.json({
    env: {
      googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      nextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      nextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
      aiTailoring: Boolean(process.env.ANTHROPIC_API_KEY),
      nodeEnv: process.env.NODE_ENV ?? "unknown",
    },
    database: {
      name: mongoose.connection?.name ?? "unknown",
      readyState: mongoose.connection?.readyState ?? 0,
    },
    counts: {
      users: Object.values(byRole).reduce((a, b) => a + b, 0),
      byRole,
      byPlan,
      applications,
      cvProfiles: profiles,
      cvFiles: files,
      legacyEmbeddedProfiles: legacyProfiles,
    },
  });
}

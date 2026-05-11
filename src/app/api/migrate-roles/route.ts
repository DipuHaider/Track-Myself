export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { SUPERADMIN_EMAILS } from "@/lib/permissions";

// One-time migration: rename old roles and promote superadmin emails.
// Only callable by superadmin or admin.
export async function POST() {
  const session = await getServerSession(authOptions as any);
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "superadmin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const [generalResult, premiumResult, superadminResult] = await Promise.all([
    // general → free
    User.updateMany({ role: "general" }, { $set: { role: "free" } }),
    // premium → paid
    User.updateMany({ role: "premium" }, { $set: { role: "paid" } }),
    // promote superadmin emails
    User.updateMany(
      { email: { $in: [...SUPERADMIN_EMAILS] } },
      { $set: { role: "superadmin" } }
    ),
  ]);

  return NextResponse.json({
    generalRenamed: generalResult.modifiedCount,
    premiumRenamed: premiumResult.modifiedCount,
    superadminPromoted: superadminResult.modifiedCount,
  });
}

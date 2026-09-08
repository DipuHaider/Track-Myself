export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { requireActiveAdminAuth } from "@/lib/serverAuth";
import { SUPERADMIN_EMAILS } from "@/lib/permissions";

async function runMigration() {
  await dbConnect();

  const [generalResult, premiumResult, superadminResult] = await Promise.all([
    User.updateMany({ role: "general" }, { $set: { role: "free" } }),
    User.updateMany({ role: "premium" }, { $set: { role: "paid" } }),
    User.updateMany(
      { email: { $in: [...SUPERADMIN_EMAILS] } },
      { $set: { role: "superadmin" } }
    ),
  ]);

  return {
    generalRenamed: generalResult.modifiedCount,
    premiumRenamed: premiumResult.modifiedCount,
    superadminPromoted: superadminResult.modifiedCount,
  };
}

async function authorize() {
  const auth = await requireActiveAdminAuth();
  return auth instanceof NextResponse ? auth : null;
}

// One-time migration: rename old roles and promote superadmin emails.
// Only callable by superadmin or admin.
export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  return NextResponse.json(await runMigration());
}

export async function POST() {
  const denied = await authorize();
  if (denied) return denied;
  return NextResponse.json(await runMigration());
}

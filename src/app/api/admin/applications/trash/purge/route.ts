export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireActiveAdminAuth } from "@/lib/serverAuth";
import { recordAdminAction } from "@/lib/audit";
import { purgeExpiredApplications } from "@/lib/applicationTrash";

export async function POST() {
  const auth = await requireActiveAdminAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const purged = await purgeExpiredApplications();
  await recordAdminAction({ actor: auth, action: "application.purge", targetType: "system", targetLabel: "expired trash", after: { purged } });
  return NextResponse.json({ purged });
}

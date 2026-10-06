export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAdminAuth } from "@/lib/serverAuth";
import { purgeExpiredApplications } from "@/lib/applicationTrash";

export async function POST() {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  return NextResponse.json({ purged: await purgeExpiredApplications() });
}

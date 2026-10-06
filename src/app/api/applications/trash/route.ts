export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAuth } from "@/lib/serverAuth";
import { TRASH_DAYS, listDeletedApplications } from "@/lib/applicationTrash";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const items = await listDeletedApplications({ userId: auth.id });
  return NextResponse.json({ days: TRASH_DAYS, items });
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { listLeads } from "@/lib/jobs/leads";

export async function GET(req: Request) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  const params = new URL(req.url).searchParams;
  return NextResponse.json(await listLeads(auth.id, params));
}

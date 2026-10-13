export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";
import { cronGate } from "@/lib/cronAuth";

async function handle(req: Request) {
  const denied = cronGate(req);
  if (denied) return denied;

  const summary = await runMaintenance("cron");
  return NextResponse.json(summary, { status: summary.errors.length ? 207 : 200 });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

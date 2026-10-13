export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { cronGate } from "@/lib/cronAuth";
import { runDailyJobHunt } from "@/lib/jobs/daily";

async function handle(req: Request) {
  const denied = cronGate(req);
  if (denied) return denied;

  const summary = await runDailyJobHunt();
  const failed = summary.users.some((u) => u.error);
  return NextResponse.json(summary, { status: failed ? 207 : 200 });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

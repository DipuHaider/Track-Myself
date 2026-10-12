export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";

const DB_TIMEOUT_MS = 3000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

export async function GET() {
  const started = Date.now();
  let db: "up" | "down" = "down";
  try {
    await Promise.race([dbConnect(), timeout(DB_TIMEOUT_MS)]);
    await Promise.race([mongoose.connection.db?.admin().ping(), timeout(DB_TIMEOUT_MS)]);
    db = "up";
  } catch {
    db = "down";
  }

  const body = {
    status: db === "up" ? "ok" : "degraded",
    db,
    latencyMs: Date.now() - started,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: db === "up" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

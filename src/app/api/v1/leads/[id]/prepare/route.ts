export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { authenticateToken } from "@/lib/apiTokens";
import { prepareLead } from "@/lib/jobs/prepare";
import { parseObjectId } from "@/lib/objectId";
import { notFound, tooMany } from "@/lib/api/respond";
import { checkRateLimitDb } from "@/lib/rateLimitStore";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await authenticateToken(req, "prepare");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!parseObjectId(id)) return notFound();

  const gate = await checkRateLimitDb({ key: `lead-prepare:user:${auth.id}`, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate, "Twenty preparations an hour.");

  const res = await prepareLead(id, auth);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.error === "Not found" ? 404 : 422 });
  return NextResponse.json(res);
}

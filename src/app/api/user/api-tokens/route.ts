export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/db";
import ApiToken, { API_SCOPES } from "@/models/ApiToken";
import { requireJobHuntAuth } from "@/lib/jobs/access";
import { createToken, TOKEN_LIMIT } from "@/lib/apiTokens";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { badRequest, tooMany } from "@/lib/api/respond";

export async function GET() {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const rows = await ApiToken.find({ userId: auth.id, revokedAt: null }, { hash: 0 }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(rows);
}

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  scopes: z.array(z.enum(API_SCOPES)).min(1),
  expiresInDays: z.number().int().min(1).max(365).nullable().default(90),
});

export async function POST(req: Request) {
  const auth = await requireJobHuntAuth();
  if (auth instanceof NextResponse) return auth;

  const gate = await checkRateLimitDb({ key: `pat-create:user:${auth.id}`, limit: 10, windowMs: 60 * 60 * 1000 });
  if (!gate.ok) return tooMany(gate);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid token request");

  await dbConnect();
  const count = await ApiToken.countDocuments({ userId: auth.id, revokedAt: null });
  if (count >= TOKEN_LIMIT) return badRequest(`You can keep up to ${TOKEN_LIMIT} tokens. Revoke one first.`);

  const { token, row } = await createToken(auth.id, parsed.data.name, parsed.data.scopes, parsed.data.expiresInDays);
  const { hash: _hash, ...view } = row.toObject();
  void _hash;
  return NextResponse.json({ token, row: view }, { status: 201 });
}

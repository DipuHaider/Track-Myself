export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authenticateToken } from "@/lib/apiTokens";

export async function GET(req: Request) {
  const auth = await authenticateToken(req, "leads:read");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ userId: auth.id, plan: auth.plan, scopes: auth.scopes, api: "trackmyself/v1" });
}

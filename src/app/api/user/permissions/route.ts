export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { getAllowedActions } from "@/lib/rbac";
import { isPremiumUser } from "@/lib/permissions";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    role: auth.role,
    plan: auth.plan,
    isPremium: isPremiumUser(auth.role, auth.plan),
    actions: await getAllowedActions(auth.role),
  });
}

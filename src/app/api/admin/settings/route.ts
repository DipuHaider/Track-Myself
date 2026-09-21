export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/serverAuth";
import { getAppSettings, saveAppSettings } from "@/lib/appSettings";
import { TOUR_SCOPES, type TourScope } from "@/lib/tour";

export async function GET() {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(await getAppSettings());
}

export async function PUT(req: Request) {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const patch: Partial<Record<TourScope, boolean>> = {};

  for (const scope of TOUR_SCOPES) {
    if (typeof body?.tours?.[scope] === "boolean") patch[scope] = body.tours[scope];
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const saved = await saveAppSettings(patch, auth.email ?? "");
  return NextResponse.json(saved);
}

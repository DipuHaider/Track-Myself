export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/serverAuth";
import { getAppSettings, saveAppSettings } from "@/lib/appSettings";

export async function GET() {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(await getAppSettings());
}

export async function PUT(req: Request) {
  const auth = await requireAdminAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  if (typeof body?.tourEnabled !== "boolean") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const saved = await saveAppSettings({ tourEnabled: body.tourEnabled }, auth.email ?? "");
  return NextResponse.json(saved);
}

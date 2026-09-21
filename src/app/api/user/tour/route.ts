export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAppSettings } from "@/lib/appSettings";
import { isEditor, isPremiumUser } from "@/lib/permissions";
import { TOUR_SCOPES, type TourAudience, type TourScope } from "@/lib/tour";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const [settings, user] = await Promise.all([
    getAppSettings(),
    User.findById(auth.id, "toursSeen plan role").lean() as Promise<
      { toursSeen?: string[]; plan?: string; role?: string } | null
    >,
  ]);

  const role = user?.role ?? auth.role;
  const premium = isPremiumUser(role, user?.plan);
  const audience: TourAudience = isEditor(role) ? "admin" : premium ? "premium" : "free";

  const seen = (user?.toursSeen ?? []).filter((s): s is TourScope =>
    TOUR_SCOPES.includes(s as TourScope),
  );

  return NextResponse.json({
    enabled: settings.tours,
    audience,
    premium,
    seen,
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  const scope = TOUR_SCOPES.includes(body?.scope) ? (body.scope as TourScope) : null;
  if (!scope) return NextResponse.json({ error: "Unknown tour" }, { status: 400 });

  await User.findByIdAndUpdate(auth.id, { $addToSet: { toursSeen: scope } });
  return NextResponse.json({ ok: true });
}

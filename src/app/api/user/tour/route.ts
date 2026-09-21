export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { getAppSettings } from "@/lib/appSettings";
import { isPremiumUser } from "@/lib/permissions";
import { TOUR_VARIANTS, type TourVariant } from "@/lib/tour";

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

  const variant: TourVariant = isPremiumUser(user?.role ?? auth.role, user?.plan)
    ? "premium"
    : "free";

  return NextResponse.json({
    enabled: settings.tourEnabled,
    variant,
    seen: (user?.toursSeen ?? []).includes(variant),
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  await dbConnect();

  const body = await req.json().catch(() => null);
  const variant = TOUR_VARIANTS.includes(body?.variant) ? (body.variant as TourVariant) : null;
  if (!variant) return NextResponse.json({ error: "Unknown tour" }, { status: 400 });

  await User.findByIdAndUpdate(auth.id, { $addToSet: { toursSeen: variant } });
  return NextResponse.json({ ok: true });
}

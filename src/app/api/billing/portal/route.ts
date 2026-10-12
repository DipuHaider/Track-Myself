export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireActiveAuth } from "@/lib/serverAuth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { billingProvider } from "@/lib/billing";
import { SITE_URL } from "@/lib/seo";

const unavailable = () =>
  NextResponse.json(
    { error: "There is no billing portal for this account yet. Contact support to change your plan.", code: "billing-unavailable" },
    { status: 501 },
  );

export async function POST() {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  const row = (await User.findById(auth.id, "billing.customerId").lean()) as
    | { billing?: { customerId?: string } }
    | null;
  const customerId = row?.billing?.customerId ?? "";
  if (!customerId) return unavailable();

  const portal = await billingProvider().createPortal({
    customerId,
    returnUrl: `${SITE_URL}/me/settings?tab=plan`,
  });
  if (!portal) return unavailable();
  return NextResponse.json({ url: portal.url });
}

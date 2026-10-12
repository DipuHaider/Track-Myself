export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAuth } from "@/lib/serverAuth";
import { billingProvider } from "@/lib/billing";
import { SITE_URL } from "@/lib/seo";

const schema = z.object({ plan: z.literal("premium") });

export async function POST(req: Request) {
  const auth = await requireActiveAuth();
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a plan to continue" }, { status: 400 });

  const checkout = await billingProvider().createCheckout({
    userId: auth.id,
    email: auth.email ?? "",
    plan: parsed.data.plan,
    returnUrl: `${SITE_URL}/me/settings?tab=plan`,
  });

  if (!checkout) {
    return NextResponse.json(
      { error: "Self-service checkout is not set up yet. Send an upgrade request instead.", code: "billing-unavailable" },
      { status: 501 },
    );
  }
  return NextResponse.json({ url: checkout.url });
}

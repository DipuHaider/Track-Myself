export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { billingProvider, isManualBilling } from "@/lib/billing";
import { applyBillingEvent } from "@/lib/billing/apply";

export async function POST(req: Request) {
  if (isManualBilling()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provider = billingProvider();
  const rawBody = await req.text();

  if (!provider.verifyWebhook(rawBody, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = provider.parseEvent(rawBody);
  if (!event) return NextResponse.json({ error: "Could not parse the event" }, { status: 400 });

  const result = await applyBillingEvent(event, provider.id);
  return NextResponse.json({ received: true, applied: result.ok });
}

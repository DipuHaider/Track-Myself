import dbConnect from "@/lib/db";
import User from "@/models/User";
import { invalidateClaims } from "@/lib/auth";
import { notify } from "@/lib/notifications/create";
import type { BillingEvent } from "@/lib/billing/types";

export type ApplyResult =
  | { ok: true; userId: string; plan: BillingEvent["plan"]; changed: boolean }
  | { ok: false; reason: "no-user" };

export async function applyBillingEvent(event: BillingEvent, source: "manual" | string): Promise<ApplyResult> {
  await dbConnect();

  const query = event.userId
    ? { _id: event.userId }
    : event.customerId
      ? { "billing.customerId": event.customerId }
      : null;
  if (!query) return { ok: false, reason: "no-user" };

  const before = (await User.findOne(query, "email plan").lean()) as
    | { _id: { toString(): string }; email?: string; plan?: string }
    | null;
  if (!before) return { ok: false, reason: "no-user" };

  const set: Record<string, unknown> = {
    plan: event.plan,
    "billing.provider": source,
    "billing.status": event.status,
    "billing.currentPeriodEnd": event.currentPeriodEnd ?? null,
    "billing.updatedAt": new Date(),
  };
  if (event.customerId !== undefined) set["billing.customerId"] = event.customerId;
  if (event.subscriptionId !== undefined) set["billing.subscriptionId"] = event.subscriptionId;

  await User.updateOne({ _id: before._id }, { $set: set });
  invalidateClaims(before.email);

  const userId = before._id.toString();
  const changed = (before.plan ?? "free") !== event.plan;
  if (changed) {
    await notify({
      userId,
      type: "account",
      title: "Your account changed",
      body: `${event.plan === "premium" ? "your account was upgraded to Premium" : "your account moved to the Free plan"}.`,
      href: "/me/settings?tab=plan",
    });
  }

  return { ok: true, userId, plan: event.plan, changed };
}

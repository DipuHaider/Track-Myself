import type { Plan } from "@/lib/permissions";
import type { BillingStatus } from "@/lib/billing/types";

export type PlanInput = {
  status: BillingStatus;
  currentPeriodEnd?: Date | string | null;
  now?: Date;
};

export function planFromBilling({ status, currentPeriodEnd, now = new Date() }: PlanInput): Plan {
  if (status === "active" || status === "trialing") return "premium";
  if (status === "past_due" || status === "cancelled") {
    if (!currentPeriodEnd) return "free";
    const end = currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(currentPeriodEnd);
    if (Number.isNaN(end.getTime())) return "free";
    return end.getTime() > now.getTime() ? "premium" : "free";
  }
  return "free";
}

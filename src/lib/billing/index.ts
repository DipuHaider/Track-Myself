import { manual } from "@/lib/billing/manual";
import type { BillingProvider } from "@/lib/billing/types";

export type { BillingEvent, BillingProvider, BillingStatus } from "@/lib/billing/types";
export { planFromBilling } from "@/lib/billing/plan";

const REGISTRY: Record<string, BillingProvider> = { manual };

export function billingProviderId(): string {
  return (process.env.BILLING_PROVIDER ?? "manual").trim().toLowerCase() || "manual";
}

export function billingProvider(): BillingProvider {
  const id = billingProviderId();
  const provider = REGISTRY[id];
  if (!provider) {
    throw new Error(
      `Unknown BILLING_PROVIDER "${id}" — add an adapter in src/lib/billing/${id}.ts and register it in src/lib/billing/index.ts`,
    );
  }
  return provider;
}

export function billingWebhookSecret(): string {
  return process.env.BILLING_WEBHOOK_SECRET ?? "";
}

export function isManualBilling(): boolean {
  return billingProviderId() === "manual";
}

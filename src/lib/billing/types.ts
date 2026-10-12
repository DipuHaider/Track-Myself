import type { Plan } from "@/lib/permissions";

export const BILLING_STATUSES = ["none", "trialing", "active", "past_due", "cancelled"] as const;

export type BillingStatus = (typeof BILLING_STATUSES)[number];

export type BillingEvent = {
  userId: string | null;
  customerId?: string;
  subscriptionId?: string;
  plan: Plan;
  status: BillingStatus;
  currentPeriodEnd?: Date | null;
  raw?: unknown;
};

export type CheckoutInput = { userId: string; email: string; plan: Plan; returnUrl: string };
export type PortalInput = { customerId: string; returnUrl: string };

export type BillingProvider = {
  id: string;
  createCheckout(input: CheckoutInput): Promise<{ url: string } | null>;
  createPortal(input: PortalInput): Promise<{ url: string } | null>;
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  parseEvent(rawBody: string): BillingEvent | null;
};

import type { BillingProvider } from "@/lib/billing/types";

/* No payment processor: plans are switched by an admin from /dashboard/users
   and every self-service entry point reports "billing unavailable". */
export const manual: BillingProvider = {
  id: "manual",
  async createCheckout() {
    return null;
  },
  async createPortal() {
    return null;
  },
  verifyWebhook() {
    return false;
  },
  parseEvent() {
    return null;
  },
};

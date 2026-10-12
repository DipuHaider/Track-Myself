import { describe, expect, it } from "vitest";
import { planFromBilling } from "@/lib/billing/plan";

const now = new Date("2026-10-12T12:00:00Z");
const future = new Date("2026-11-01T00:00:00Z");
const past = new Date("2026-10-01T00:00:00Z");

describe("planFromBilling", () => {
  it("is premium while the subscription is active or trialing", () => {
    expect(planFromBilling({ status: "active", now })).toBe("premium");
    expect(planFromBilling({ status: "trialing", now })).toBe("premium");
    expect(planFromBilling({ status: "active", currentPeriodEnd: past, now })).toBe("premium");
  });

  it("keeps premium until the paid period ends after a cancellation or failed payment", () => {
    expect(planFromBilling({ status: "cancelled", currentPeriodEnd: future, now })).toBe("premium");
    expect(planFromBilling({ status: "past_due", currentPeriodEnd: future, now })).toBe("premium");
    expect(planFromBilling({ status: "cancelled", currentPeriodEnd: past, now })).toBe("free");
    expect(planFromBilling({ status: "past_due", currentPeriodEnd: past, now })).toBe("free");
    expect(planFromBilling({ status: "cancelled", currentPeriodEnd: future.toISOString(), now })).toBe("premium");
  });

  it("is free without a period end, with a bad date, or with no subscription", () => {
    expect(planFromBilling({ status: "cancelled", now })).toBe("free");
    expect(planFromBilling({ status: "past_due", currentPeriodEnd: null, now })).toBe("free");
    expect(planFromBilling({ status: "cancelled", currentPeriodEnd: "not a date", now })).toBe("free");
    expect(planFromBilling({ status: "none", currentPeriodEnd: future, now })).toBe("free");
  });
});

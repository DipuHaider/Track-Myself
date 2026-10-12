import { describe, expect, it } from "vitest";
import { isVerified } from "@/lib/verified";

describe("isVerified", () => {
  it("treats a Date as verified, null as pending, and an absent field as legacy", () => {
    expect(isVerified({ password: "hash", emailVerifiedAt: new Date() })).toBe(true);
    expect(isVerified({ password: "hash", emailVerifiedAt: null })).toBe(false);
    expect(isVerified({ password: "hash" })).toBe(true);
  });

  it("trusts provider-only accounts", () => {
    expect(isVerified({ password: null, emailVerifiedAt: null })).toBe(true);
    expect(isVerified({ emailVerifiedAt: null })).toBe(true);
    expect(isVerified(null)).toBe(false);
  });
});

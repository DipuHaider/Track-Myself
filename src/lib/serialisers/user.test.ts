import { describe, expect, it } from "vitest";
import { adminUserRow, profileView } from "@/lib/serialisers/user";

const raw = {
  _id: "507f1f77bcf86cd799439011",
  name: "Dipu",
  email: "dipu@example.com",
  password: "$2a$10$hash",
  googleId: "g-123",
  notifSeen: ["ghost:1"],
  aiKey: { provider: "anthropic", status: "ok", ciphertext: "ZZZ", iv: "iv", tag: "tag" },
  emailVerifiedAt: null,
  a11y: { scheme: "dark" },
};

describe("user serialisers", () => {
  it("never leak secrets or identifiers", () => {
    for (const shape of [adminUserRow(raw), profileView(raw)]) {
      const json = JSON.stringify(shape);
      expect(json).not.toContain("$2a$10$");
      expect(json).not.toContain("ZZZ");
      expect(json).not.toContain('"iv"');
      expect(json).not.toContain("g-123");
      expect(json).not.toContain("notifSeen");
    }
  });

  it("derives booleans from the private fields", () => {
    const row = adminUserRow(raw);
    expect(row.hasPassword).toBe(true);
    expect(row.googleLinked).toBe(true);
    expect(row.aiKey).toEqual({ configured: true, provider: "anthropic", status: "ok" });
    expect(row.emailVerified).toBe(false);
    expect(profileView({ ...raw, emailVerifiedAt: undefined }).emailVerified).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { initialHistory, sanitizeUpdate } from "@/lib/applicationHistory";

describe("sanitizeUpdate", () => {
  it("drops operators, dotted paths and protected fields", () => {
    const out = sanitizeUpdate({
      companyName: "Acme",
      $set: { role: "admin" },
      "statusHistory.0.status": "Offer Received",
      statusHistory: [],
      userId: "someone-else",
      deletedAt: null,
      createdAt: new Date(0),
      __v: 9,
      notes: "ok",
    });
    expect(out).toEqual({ companyName: "Acme", notes: "ok" });
  });
});

describe("initialHistory", () => {
  it("records a created event for a known status and nothing otherwise", () => {
    const h = initialHistory("Wishlist", { id: "u1", name: "Dipu" });
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ status: "Wishlist", kind: "created", byId: "u1", byName: "Dipu" });
    expect(initialHistory("Bogus")).toEqual([]);
  });
});

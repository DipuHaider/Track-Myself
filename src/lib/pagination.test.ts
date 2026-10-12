import { describe, expect, it } from "vitest";
import { envelope, parsePage } from "@/lib/pagination";

describe("parsePage", () => {
  it("clamps page and limit", () => {
    expect(parsePage(new URLSearchParams(""))).toEqual({ page: 1, limit: 25, skip: 0 });
    expect(parsePage(new URLSearchParams("page=3&limit=10"))).toEqual({ page: 3, limit: 10, skip: 20 });
    expect(parsePage(new URLSearchParams("page=-2&limit=9999"), { maxLimit: 100 })).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(parsePage(new URLSearchParams("page=abc"))).toMatchObject({ page: 1 });
  });

  it("builds an envelope with hasMore", () => {
    expect(envelope([1, 2], 5, { page: 1, limit: 2, skip: 0 }).hasMore).toBe(true);
    expect(envelope([1], 5, { page: 3, limit: 2, skip: 4 }).hasMore).toBe(false);
  });
});

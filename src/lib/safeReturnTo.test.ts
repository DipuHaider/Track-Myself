import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/safeReturnTo";

describe("safeReturnTo", () => {
  it.each([
    ["/me/applications?open=1#x", "/me/applications?open=1#x"],
    ["/dashboard", "/dashboard"],
    ["//evil.com", "/me"],
    ["/\\evil.com", "/me"],
    ["https://evil.com", "/me"],
    ["javascript:alert(1)", "/me"],
    ["/me\n", "/me"],
    ["", "/me"],
    [null, "/me"],
  ])("%s → %s", (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });

  it("honours a custom fallback", () => {
    expect(safeReturnTo("//x", "/login")).toBe("/login");
  });
});

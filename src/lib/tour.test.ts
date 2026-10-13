import { describe, expect, it } from "vitest";
import { scopeForPath, stepsFor } from "@/lib/tour";

describe("scopeForPath", () => {
  it.each([
    ["/", "home"],
    ["/me", "portal"],
    ["/me/applications", "portal"],
    ["/dashboard/users", "dashboard"],
    ["/applications", "dashboard"],
    ["/tools/pdf-splitter", null],
    ["/login", null],
  ] as const)("%s → %s", (path, scope) => {
    expect(scopeForPath(path)).toBe(scope);
  });
});

describe("stepsFor", () => {
  it("adds the Docs and Job hunt steps for premium portal tours only", () => {
    const free = stepsFor("portal", false).map((s) => s.id);
    const premium = stepsFor("portal", true).map((s) => s.id);
    expect(premium.length).toBe(free.length + 2);
    expect(new Set(premium).size).toBe(premium.length);
  });
});

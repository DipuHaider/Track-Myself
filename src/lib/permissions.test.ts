import { describe, expect, it } from "vitest";
import {
  canDo, canExportPdf, canUseAppDocs, canUseLebenslauf, cvFormatsFor, cvVersionLimit,
  isAdmin, isEditor, isPremiumUser, isSuperAdmin, roleTier,
} from "@/lib/permissions";

describe("role predicates", () => {
  it("orders superadmin > admin > editor", () => {
    expect(isSuperAdmin("superadmin")).toBe(true);
    expect(isSuperAdmin("admin")).toBe(false);
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("editor")).toBe(false);
    expect(isEditor("editor")).toBe(true);
    expect(isEditor("paid")).toBe(false);
    expect(isEditor(null)).toBe(false);
  });
});

describe("isPremiumUser", () => {
  it.each([
    ["superadmin", "free", true],
    ["paid", "free", true],
    ["admin", "free", false],
    ["admin", "premium", true],
    ["editor", "premium", true],
    ["free", "free", false],
    ["free", "premium", true],
    [null, null, false],
  ] as const)("%s / %s → %s", (role, plan, expected) => {
    expect(isPremiumUser(role, plan)).toBe(expected);
  });
});

describe("CV entitlements", () => {
  it("free accounts get the compact ATS and designer formats only", () => {
    expect(cvFormatsFor("free", "free")).toEqual(["ats:compact", "designer:full"]);
    expect(canExportPdf("free", "free")).toBe(false);
    expect(canUseAppDocs("free", "free")).toBe(false);
    expect(cvVersionLimit("free", "free")).toBe(1);
  });

  it("premium unlocks every format except Lebenslauf", () => {
    expect(cvFormatsFor("free", "premium")).not.toContain("lebenslauf:full");
    expect(cvFormatsFor("free", "premium")).toContain("europass:full");
    expect(canExportPdf("free", "premium")).toBe(true);
    expect(cvVersionLimit("free", "premium")).toBe(5);
  });

  it("superadmin gets everything, Lebenslauf included", () => {
    expect(cvFormatsFor("superadmin")).toContain("lebenslauf:full");
    expect(canUseLebenslauf("superadmin")).toBe(true);
    expect(canUseLebenslauf("admin")).toBe(false);
    expect(cvVersionLimit("superadmin")).toBe(Infinity);
  });
});

describe("roleTier and canDo", () => {
  it("maps plan to tier for non-staff roles", () => {
    expect(roleTier("free", "premium")).toBe("premium");
    expect(roleTier("paid", "free")).toBe("premium");
    expect(roleTier("free", "free")).toBe("free");
    expect(roleTier("editor", "premium")).toBe("editor");
  });

  it("falls back to the static matrix", () => {
    expect(canDo("superadmin", "assign:superadmin")).toBe(true);
    expect(canDo("admin", "assign:superadmin")).toBe(false);
    expect(canDo(null, "view:users")).toBe(false);
  });
});

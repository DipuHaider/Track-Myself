import { describe, expect, it } from "vitest";
import { A11Y_DEFAULTS, normaliseA11y, resolveScheme } from "@/lib/a11y";

describe("normaliseA11y", () => {
  it("tolerates junk and coerces booleans strictly", () => {
    expect(normaliseA11y(null)).toEqual(A11Y_DEFAULTS);
    expect(normaliseA11y({ textScale: "huge", scheme: "neon", contrast: "yes" })).toEqual(A11Y_DEFAULTS);
    expect(normaliseA11y({ textScale: "xl", scheme: "dark", contrast: true })).toMatchObject({
      textScale: "xl", scheme: "dark", contrast: true, reduceMotion: false,
    });
  });
});

describe("resolveScheme", () => {
  it("resolves explicit schemes and defaults system to light without a window", () => {
    expect(resolveScheme("dark")).toBe("dark");
    expect(resolveScheme("light")).toBe("light");
    expect(resolveScheme("system")).toBe("light");
  });
});

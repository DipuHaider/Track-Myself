import { describe, expect, it } from "vitest";
import { compactAmount, formatSalary, isValidRange, parseAmount } from "@/lib/salary";

describe("parseAmount", () => {
  it.each([
    ["70K", 70_000],
    ["1.2M", 1_200_000],
    ["70,000", 70_000],
    ["70.000", 70_000],
    ["70,5K", 70_500],
    ["€ 48k", 48_000],
    ["৳120000", 120_000],
  ])("%s → %d", (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  it("returns null for blank and NaN for garbage", () => {
    expect(parseAmount("   ")).toBeNull();
    expect(Number.isNaN(parseAmount("lots"))).toBe(true);
  });
});

describe("compactAmount and formatSalary", () => {
  it("shortens thousands and millions", () => {
    expect(compactAmount(70_000)).toBe("70K");
    expect(compactAmount(1_250_000)).toBe("1.25M");
    expect(compactAmount(950)).toBe("950");
    expect(compactAmount(null)).toBe("");
  });

  it("renders fixed, ranges with one bound, and the no-amount types", () => {
    expect(formatSalary({ salaryType: "fixed", salaryFixed: 70_000, salaryCurrency: "EUR" })).toBe("€70K");
    expect(formatSalary({ salaryType: "range", salaryMin: 70_000, salaryMax: 90_000, salaryCurrency: "EUR" })).toBe("€70K – €90K");
    expect(formatSalary({ salaryType: "range", salaryMin: 70_000, salaryCurrency: "USD" })).toBe("from $70K");
    expect(formatSalary({ salaryType: "range", salaryMax: 90_000, salaryCurrency: "BDT" })).toBe("up to ৳90K");
    expect(formatSalary({ salaryType: "negotiable" })).toBe("Negotiable");
    expect(formatSalary({ salaryType: "not-mentioned" })).toBe("Not mentioned");
  });
});

describe("isValidRange", () => {
  it("refuses min above max but tolerates blanks", () => {
    expect(isValidRange("90K", "70K")).toBe(false);
    expect(isValidRange("70K", "90K")).toBe(true);
    expect(isValidRange("", "90K")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  ACTIVE_STAGES, APPLICATION_STATUSES, CLOSED_STATUSES, MAIN_STATUSES, SUBMISSION_DETAIL_METHODS,
  SUBMISSION_LINK_METHODS, SUBMISSION_METHODS, composeStatus, mainStatusOf, methodsOf, normaliseMethods, stageOf,
} from "@/constants/applicationStatus";

describe("two-level statuses", () => {
  it("folds the Active stages under one main status", () => {
    expect(MAIN_STATUSES).toContain("Active");
    expect(MAIN_STATUSES.some((s) => s.startsWith("Active - "))).toBe(false);
    expect(ACTIVE_STAGES).toEqual(["Written", "HR", "Technical", "Cultural Fit"]);
    expect(MAIN_STATUSES.at(-1)).toBe("Withdrawn");
  });

  it("round-trips every stored status", () => {
    for (const s of APPLICATION_STATUSES) expect(composeStatus(mainStatusOf(s), stageOf(s))).toBe(s);
  });

  it("keeps the stage when switching back to Active and defaults otherwise", () => {
    expect(composeStatus("Active", "HR")).toBe("Active - HR");
    expect(composeStatus("Active", "")).toBe("Active - Written");
    expect(composeStatus("Submitted", "HR")).toBe("Submitted");
  });

  it("treats Withdrawn as closed and every link method as a detail method", () => {
    expect(CLOSED_STATUSES).toContain("Withdrawn");
    for (const m of SUBMISSION_LINK_METHODS) {
      expect(SUBMISSION_DETAIL_METHODS.has(m)).toBe(true);
      expect(SUBMISSION_METHODS as readonly string[]).toContain(m);
    }
    for (const m of SUBMISSION_DETAIL_METHODS) expect(SUBMISSION_METHODS as readonly string[]).toContain(m);
  });
});

describe("several submission methods", () => {
  it("reads older single-method applications", () => {
    expect(methodsOf({ submissionMethod: "Postal Mail" })).toEqual(["Postal Mail"]);
    expect(methodsOf({ submissionMethod: "Postal Mail", submissionMethods: ["CV Drop", "Email to Contact"] }))
      .toEqual(["CV Drop", "Email to Contact"]);
    expect(methodsOf({})).toEqual([]);
  });

  it("keeps only known methods, once each", () => {
    expect(normaliseMethods(["CV Drop", "Fax", "CV Drop", 3, "LinkedIn Message"])).toEqual(["CV Drop", "LinkedIn Message"]);
    expect(normaliseMethods("CV Drop")).toEqual([]);
  });
});

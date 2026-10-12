import { describe, expect, it } from "vitest";
import {
  TRIAGE_REASONS,
  TRIAGE_REASON_IDS,
  attentionSummary,
  triageReason,
  triageReasonBadge,
  triageReasonLabel,
} from "@/lib/triageLabels";

describe("triage labels", () => {
  it("has a label and a badge class for every known reason", () => {
    for (const id of TRIAGE_REASON_IDS) {
      expect(TRIAGE_REASONS[id].label.length).toBeGreaterThan(0);
      expect(TRIAGE_REASONS[id].badge).toMatch(/^status-/);
    }
  });

  it("returns the known mapping", () => {
    expect(triageReasonLabel("interview-soon")).toBe("Interview soon");
    expect(triageReasonBadge("interview-soon")).toBe("status-interview");
  });

  it("falls back gracefully for an unknown id", () => {
    expect(triageReason("something-new")).toEqual({ label: "Something new", badge: "status-wishlist" });
    expect(triageReason("")).toEqual({ label: "Needs attention", badge: "status-wishlist" });
  });

  it("phrases the attention count", () => {
    expect(attentionSummary(0)).toBe("Nothing needs attention right now.");
    expect(attentionSummary(1)).toBe("1 application needs attention");
    expect(attentionSummary(4)).toBe("4 applications need attention");
  });
});

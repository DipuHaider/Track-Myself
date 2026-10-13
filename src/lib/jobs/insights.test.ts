import { describe, expect, it } from "vitest";
import { toInsightRow } from "./insights";

const base = { _id: "a1", companyName: "A", jobTitle: "Dev", platform: "StepStone", createdAt: new Date("2026-10-01T09:00:00Z") };

describe("toInsightRow", () => {
  it("measures days to first response from the history", () => {
    const row = toInsightRow({
      ...base,
      applicationStatus: "Rejected",
      appliedDate: new Date("2026-10-01T09:00:00Z"),
      statusHistory: [
        { status: "Submitted", at: new Date("2026-10-01T09:00:00Z") },
        { status: "Rejected", at: new Date("2026-10-08T09:00:00Z") },
      ],
    }, { fitScore: 72, source: "ba" }, 0);
    expect(row).toMatchObject({ responded: true, rejected: true, interviewed: false, daysToFirstResponse: 7, fitScore: 72, source: "ba" });
    expect(row.appliedWeekday).toBe(new Date("2026-10-01T09:00:00Z").getDay());
  });

  it("treats silence as no response and counts interview rounds", () => {
    const silent = toInsightRow({ ...base, applicationStatus: "No Response", statusHistory: [] }, undefined, 0);
    expect(silent).toMatchObject({ responded: false, daysToFirstResponse: null, source: "manual", appliedAt: null });
    const rounds = toInsightRow({ ...base, applicationStatus: "Submitted" }, undefined, 2);
    expect(rounds.interviewed).toBe(true);
  });
});

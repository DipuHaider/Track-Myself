import { describe, expect, it } from "vitest";
import { interviewCreateSchema, interviewUpdateSchema } from "@/schemas/interviewSchema";

describe("interview schemas", () => {
  it("requires a stage and parses dates", () => {
    const ok = interviewCreateSchema.safeParse({ stageName: "HR", scheduledDate: "2026-11-01T10:00:00Z" });
    expect(ok.success && ok.data.scheduledDate instanceof Date).toBe(true);
    expect(ok.success && ok.data.status).toBe("Scheduled");
    expect(interviewCreateSchema.safeParse({ stageName: "" }).success).toBe(false);
    expect(interviewCreateSchema.safeParse({ stageName: "HR", status: "Nope" }).success).toBe(false);
  });

  it("tolerates a bad date on update by nulling it", () => {
    const r = interviewUpdateSchema.safeParse({ scheduledDate: "not a date" });
    expect(r.success && r.data.scheduledDate).toBeNull();
  });
});

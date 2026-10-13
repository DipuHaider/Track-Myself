import { describe, expect, it } from "vitest";
import { draftsFromInput, externalIdFor, ingestBatchSchema } from "./ingestApi";

describe("automation ingest", () => {
  it("validates batches", () => {
    expect(ingestBatchSchema.safeParse({ leads: [] }).success).toBe(false);
    expect(ingestBatchSchema.safeParse({ leads: [{ title: "x", company: "y", url: "javascript:alert(1)" }] }).success).toBe(false);
    const ok = ingestBatchSchema.safeParse({ source: "email-alert", leads: [{ title: "Dev", company: "A", url: "https://www.linkedin.com/jobs/view/123456" }] });
    expect(ok.success).toBe(true);
  });

  it("derives a stable external id from the link", () => {
    expect(externalIdFor({ url: "https://a.de/1" })).toBe(externalIdFor({ url: "https://a.de/1" }));
    expect(externalIdFor({ url: "https://a.de/1", externalId: "x" })).toBe("x");
  });

  it("builds drafts with platform and identity from the link", () => {
    const [d] = draftsFromInput("email-alert", [{
      title: "Frontend Developer", company: "Beispiel GmbH", url: "https://www.linkedin.com/jobs/view/4012345678",
      postedAt: "2026-10-12T08:00:00Z", deadline: "nonsense",
    }], new Date("2026-10-13T08:00:00Z"));
    expect(d.platform).toBe("LinkedIn");
    expect(d.identity).toBe("linkedin:4012345678");
    expect(d.deadline).toBeNull();
    expect(d.postedAt?.toISOString()).toBe("2026-10-12T08:00:00.000Z");
  });
});

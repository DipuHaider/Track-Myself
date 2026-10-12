import { describe, expect, it } from "vitest";
import type { Application } from "@/types/application";
import {
  computeDuplicateGroups, computeDuplicateIds, isPossibleGhost, isWarmLead, normaliseCompany, normaliseTitle, postingIdentity,
} from "@/lib/applicationFlags";

const DAY = 86_400_000;

function app(over: Partial<Application>): Application {
  return {
    _id: over._id ?? Math.random().toString(36).slice(2),
    companyName: "Acme",
    jobTitle: "Engineer",
    applicationStatus: "Submitted",
    ...over,
  } as Application;
}

describe("isPossibleGhost", () => {
  it("flags quiet submitted rows after 45 days, not before", () => {
    const old = new Date(Date.now() - 46 * DAY);
    const recent = new Date(Date.now() - 44 * DAY);
    expect(isPossibleGhost(app({ appliedDate: old }))).toBe(true);
    expect(isPossibleGhost(app({ appliedDate: recent }))).toBe(false);
  });

  it("uses createdAt for wishlist rows and ignores active statuses", () => {
    const old = new Date(Date.now() - 60 * DAY);
    expect(isPossibleGhost(app({ applicationStatus: "Wishlist", createdAt: old }))).toBe(true);
    expect(isPossibleGhost(app({ applicationStatus: "Active - HR", appliedDate: old }))).toBe(false);
    expect(isPossibleGhost(app({ applicationStatus: "Submitted" }))).toBe(false);
  });
});

describe("normalisation", () => {
  it("strips legal suffixes from the end only", () => {
    expect(normaliseCompany("Blotato GmbH")).toBe("blotato");
    expect(normaliseCompany("Blotato Holdings Ltd.")).toBe("blotato");
    expect(normaliseCompany("Limited Books")).toBe("limited books");
  });

  it("keeps seniority and qualifiers in titles", () => {
    expect(normaliseTitle("Senior  Engineer (Backend)!")).toBe("senior engineer (backend)");
    expect(normaliseTitle("Engineer")).not.toBe(normaliseTitle("Senior Engineer"));
  });

  it("extracts posting ids from LinkedIn and Indeed URLs", () => {
    expect(postingIdentity(app({ jobPostUrl: "https://www.linkedin.com/jobs/view/4012345678/" }))).toBe("linkedin:4012345678");
    expect(postingIdentity(app({ jobPostUrl: "https://de.indeed.com/viewjob?jk=abc123" }))).toBe("indeed:abc123");
    expect(postingIdentity(app({ jobPostUrl: "https://example.com/jobs/1" }))).toBeNull();
  });
});

describe("duplicates", () => {
  it("groups by normalised company + title and prefers the posting id", () => {
    const rows = [
      app({ _id: "a", companyName: "Blotato", jobTitle: "Engineer" }),
      app({ _id: "b", companyName: "Blotato GmbH", jobTitle: "engineer" }),
      app({ _id: "c", companyName: "Other", jobTitle: "Engineer", jobPostUrl: "https://linkedin.com/jobs/view/1" }),
      app({ _id: "d", companyName: "Other Inc", jobTitle: "Designer", jobPostUrl: "https://linkedin.com/jobs/view/1" }),
      app({ _id: "e", companyName: "Solo", jobTitle: "Engineer" }),
    ];
    const groups = computeDuplicateGroups(rows);
    expect(groups.get("a")).toBe("same-role");
    expect(groups.get("b")).toBe("same-role");
    expect(groups.get("c")).toBe("same-posting");
    expect(groups.get("d")).toBe("same-posting");
    expect(computeDuplicateIds(rows).has("e")).toBe(false);
  });
});

describe("isWarmLead", () => {
  it("is only a rejected row with positive feedback", () => {
    expect(isWarmLead({ applicationStatus: "Rejected", responseStatus: "Positive – keep in touch" })).toBe(true);
    expect(isWarmLead({ applicationStatus: "Rejected", responseStatus: "Generic rejection" })).toBe(false);
    expect(isWarmLead({ applicationStatus: "Submitted", responseStatus: "Positive – keep in touch" })).toBe(false);
  });
});

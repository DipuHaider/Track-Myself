import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  apps: [] as Record<string, unknown>[],
  leads: [] as Record<string, unknown>[],
  upserts: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/db", () => ({ default: async () => undefined }));
vi.mock("@/models/Application", () => ({
  default: { find: () => ({ lean: async () => state.apps }) },
}));
vi.mock("@/models/JobLead", () => ({
  default: {
    find: () => ({ lean: async () => state.leads }),
    updateOne: async (filter: Record<string, unknown>, update: Record<string, unknown>, opts?: { upsert?: boolean }) => {
      if (opts?.upsert) {
        state.upserts.push({ filter, update });
        return { upsertedId: `new-${state.upserts.length}` };
      }
      state.updates.push({ filter, update });
      return {};
    },
  },
}));

import { ingestLeads } from "./ingest";
import { toLeadDraft } from "./normalise";
import type { LeadDraft } from "./types";

const now = new Date("2026-10-13T08:00:00Z");
function draft(over: Partial<Parameters<typeof toLeadDraft>[0]> = {}): LeadDraft {
  return toLeadDraft({
    source: "ba", externalId: "1", title: "Frontend Developer", company: "Beispiel GmbH",
    url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/1", postedAt: now, ...over,
  }, now)!;
}

beforeEach(() => {
  state.apps = [];
  state.leads = [];
  state.upserts = [];
  state.updates = [];
});

describe("ingestLeads", () => {
  it("creates new leads", async () => {
    const res = await ingestLeads("u1", [draft()]);
    expect(res.created).toBe(1);
    expect(state.upserts).toHaveLength(1);
  });

  it("skips jobs already tracked as applications, by company and title", async () => {
    state.apps = [{ companyName: "Beispiel", jobTitle: "frontend developer" }];
    const res = await ingestLeads("u1", [draft()]);
    expect(res.tracked).toBe(1);
    expect(res.created).toBe(0);
  });

  it("skips jobs already tracked by posting link", async () => {
    state.apps = [{ companyName: "Other", jobTitle: "Other", jobPostUrl: "https://www.linkedin.com/jobs/view/987654" }];
    const res = await ingestLeads("u1", [draft({ source: "linkedin", externalId: "987654", url: "https://www.linkedin.com/jobs/view/987654" })]);
    expect(res.tracked).toBe(1);
  });

  it("merges the same job from another source into the existing lead", async () => {
    state.leads = [{ _id: "L1", identity: "ba:1", matchKey: draft().matchKey, description: "short", url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/1", otherUrls: [] }];
    const res = await ingestLeads("u1", [draft({ source: "adzuna", externalId: "99", url: "https://www.adzuna.de/land/ad/99", description: "a much longer description of the job" })]);
    expect(res.merged).toBe(1);
    expect(res.created).toBe(0);
    expect(state.updates[0].update).toMatchObject({ $set: { description: "a much longer description of the job" } });
  });

  it("collapses duplicates inside one batch and honours exclusions", async () => {
    const res = await ingestLeads("u1", [
      draft(),
      draft({ source: "adzuna", externalId: "2", url: "https://www.adzuna.de/land/ad/2" }),
      draft({ externalId: "3", company: "Blocked AG", title: "Dev", url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/3" }),
    ], { excludeCompanies: ["Blocked"] });
    expect(res.created).toBe(1);
    expect(res.merged).toBe(1);
  });
});

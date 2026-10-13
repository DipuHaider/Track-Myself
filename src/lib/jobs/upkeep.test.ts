import { beforeEach, describe, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({ existing: [] as { title: string }[], inserted: [] as { title: string }[] }));

vi.mock("@/lib/db", () => ({ default: async () => undefined }));
vi.mock("@/models/Todo", () => ({
  default: {
    find: () => ({ lean: async () => s.existing }),
    insertMany: async (docs: { title: string }[]) => { s.inserted.push(...docs); return docs; },
  },
}));
vi.mock("@/models/JobLead", () => ({ default: {} }));
vi.mock("@/models/Application", () => ({ default: {} }));
vi.mock("@/models/User", () => ({ default: {} }));
vi.mock("@/lib/notifications/create", () => ({ notify: async () => undefined }));
vi.mock("@/lib/notifications/derive", () => ({ loadNotificationPrefs: async () => ({}), isMuted: () => false }));
vi.mock("@/lib/mail", () => ({ sendJobHuntReportMail: async () => ({ ok: true }) }));
vi.mock("@/lib/jobs/webhooks", () => ({ sendWebhook: async () => ({ delivered: false, status: "" }) }));
vi.mock("@/lib/jobs/report", () => ({ buildDailyReport: async () => null }));

import { createFollowUpTodos, followUpTitle } from "./upkeep";
import type { TriageRow } from "@/lib/ai/triage";

const rowFor = (company: string, reasons: TriageRow["reasons"]): TriageRow =>
  ({ id: company, company, jobTitle: "Dev", status: "Submitted", reasons, observed: [], daysSinceApplied: 10, suggestion: "" });

beforeEach(() => {
  s.existing = [];
  s.inserted = [];
});

describe("createFollowUpTodos", () => {
  it("adds one to-do per overdue follow-up and never duplicates", async () => {
    s.existing = [{ title: followUpTitle(rowFor("B", ["follow-up-due"])) }];
    const n = await createFollowUpTodos("u1", [
      rowFor("A", ["follow-up-due"]),
      rowFor("B", ["follow-up-due"]),
      rowFor("C", ["silent-since-applied"]),
    ]);
    expect(n).toBe(1);
    expect(s.inserted.map((t) => t.title)).toEqual(["Follow up: A — Dev"]);
  });

  it("does nothing without overdue rows", async () => {
    expect(await createFollowUpTodos("u1", [rowFor("C", ["wishlist-stale"])])).toBe(0);
  });
});

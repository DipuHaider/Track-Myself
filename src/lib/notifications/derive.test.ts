import { describe, expect, it } from "vitest";
import { deriveItems, isMuted } from "@/lib/notifications/derive";
import type { Application } from "@/types/application";

const DAY = 86_400_000;
const now = new Date("2026-10-12T10:00:00Z");

function app(over: Partial<Application> & { _id: string }): Application {
  return { companyName: "Acme", jobTitle: "Engineer", applicationStatus: "Submitted", ...over } as Application;
}

describe("deriveItems", () => {
  it("flags ghosts, follow-ups inside the window, duplicates, interviews and due to-dos", () => {
    const items = deriveItems({
      now,
      apps: [
        app({ _id: "a1", appliedDate: new Date(now.getTime() - 50 * DAY) }),
        app({ _id: "a2", followUpDate: new Date(now.getTime() + 1 * DAY), appliedDate: new Date(now.getTime() - 2 * DAY) }),
        app({ _id: "a3", followUpDate: new Date(now.getTime() - 20 * DAY), appliedDate: new Date(now.getTime() - 2 * DAY) }),
        app({ _id: "d1", companyName: "Dup Co", jobTitle: "Designer", appliedDate: new Date(now.getTime() - 1 * DAY) }),
        app({ _id: "d2", companyName: "Dup Co GmbH", jobTitle: "designer", appliedDate: new Date(now.getTime() - 1 * DAY) }),
        app({ _id: "r1", applicationStatus: "Rejected", followUpDate: new Date(now.getTime()) }),
      ],
      todos: [
        { _id: "t1", title: "Chase", dueAt: new Date(now.getTime() + 1 * DAY) },
        { _id: "t2", title: "Later", dueAt: new Date(now.getTime() + 10 * DAY) },
      ],
      interviews: [
        { _id: "i1", applicationId: "a2", stageName: "HR", scheduledDate: new Date(now.getTime() + 3 * DAY), status: "Scheduled" },
        { _id: "i2", applicationId: "a2", stageName: "Old", scheduledDate: new Date(now.getTime() - 3 * DAY), status: "Scheduled" },
      ],
    });
    const ids = items.map((i) => i.id);
    expect(ids).toContain("ghost:a1");
    expect(ids.some((id) => id.startsWith("follow-up:a2:"))).toBe(true);
    expect(ids.some((id) => id.startsWith("follow-up:a3:"))).toBe(false);
    expect(ids.some((id) => id.startsWith("follow-up:r1:"))).toBe(false);
    expect(ids).toContain("dupe:d1");
    expect(ids).toContain("dupe:d2");
    expect(ids).toContain("interview:i1");
    expect(ids).not.toContain("interview:i2");
    expect(ids).toContain("todo:t1");
    expect(ids).not.toContain("todo:t2");
  });

  it("deep-links every application item", () => {
    const items = deriveItems({ now, apps: [app({ _id: "a1", appliedDate: new Date(now.getTime() - 50 * DAY) })], todos: [], interviews: [] });
    expect(items[0].href).toBe("/me/applications?open=a1");
  });
});

describe("isMuted", () => {
  it("only mutes an explicit false", () => {
    expect(isMuted({ ghost: false }, "ghost")).toBe(true);
    expect(isMuted({ ghost: true }, "ghost")).toBe(false);
    expect(isMuted({}, "ghost")).toBe(false);
  });
});

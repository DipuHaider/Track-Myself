import { describe, expect, it } from "vitest";
import { computeReport, feedbackFrom, ruleAdvice } from "./report";
import { normaliseJobHunt } from "./settings";
import type { InsightRow } from "./insights";

const now = new Date(2026, 9, 13, 7, 0, 0);
const day = 86_400_000;
const at = (offsetDays: number) => new Date(now.getTime() + offsetDays * day);

function lead(over: Record<string, unknown>) {
  return { _id: { toString: () => String(over.id ?? Math.random()) }, company: "A", title: "Dev", platform: "StepStone", fitScore: 60, deadline: null, status: "new", firstSeenAt: at(-0.2), ...over };
}

function row(over: Partial<InsightRow>): InsightRow {
  return {
    id: "x", company: "A", title: "Dev", platform: "StepStone", source: "ba", status: "Submitted",
    createdAt: at(-10).toISOString(), appliedAt: at(-10).toISOString(), appliedWeekday: 1, postedAt: null, deadline: null,
    submissionMethod: "", fitScore: 60, responded: false, interviewed: false, offer: false, rejected: false,
    daysToFirstResponse: null, interviewRounds: 0, ...over,
  };
}

describe("computeReport", () => {
  const settings = normaliseJobHunt({ enabled: true, dailyTargets: { linkedin: 2, xing: 0, stepstone: 3, other: 0 } });

  it("handles an empty account", () => {
    const r = computeReport({ now, settings, leads: [], insightRows: [], followUps: [] });
    expect(r.newLeads.total).toBe(0);
    expect(r.summary[0]).toBe("0 new jobs since yesterday.");
    expect(r.suggestions[0]).toContain("Not enough history");
  });

  it("buckets new, ready, submitted and deadlines", () => {
    const r = computeReport({
      now, settings, insightRows: [], followUps: [],
      leads: [
        lead({ id: "n1", fitScore: 40 }),
        lead({ id: "n2", fitScore: 90, platform: "LinkedIn" }),
        lead({ id: "old", firstSeenAt: at(-5) }),
        lead({ id: "r1", status: "ready" }),
        lead({ id: "s1", status: "submitted", submittedAt: at(-0.5), platform: "LinkedIn" }),
        lead({ id: "s2", status: "submitted", submittedAt: at(-1.1) }),
        lead({ id: "d1", status: "shortlisted", deadline: at(2) }),
        lead({ id: "d2", status: "shortlisted", deadline: at(10) }),
      ] as never,
    });
    expect(r.newLeads.total).toBe(2);
    expect(r.newLeads.top[0].id).toBe("n2");
    expect(r.newLeads.byPlatform).toMatchObject({ linkedin: 1, stepstone: 1 });
    expect(r.waiting.ready.map((l) => l.id)).toEqual(["r1"]);
    expect(r.waiting.shortlisted).toBe(2);
    expect(r.targets.stepstone.submittedYesterday).toBe(1);
    expect(r.targets.linkedin.submittedYesterday).toBe(1);
    expect(r.submittedYesterday.map((l) => l.id)).toEqual(["s1", "s2"]);
    expect(r.deadlines.map((l) => l.id)).toEqual(["d1"]);
    expect(r.summary.join(" ")).toContain("Yesterday you applied to 2 of 5.");
  });
});

describe("feedback and advice", () => {
  const since = at(-30);

  it("computes per-platform rates and fit bands", () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => row({ id: `s${i}`, platform: "StepStone", responded: i < 3, fitScore: 70, daysToFirstResponse: i < 3 ? 6 : null })),
      ...Array.from({ length: 6 }, (_, i) => row({ id: `l${i}`, platform: "LinkedIn", responded: i < 1, fitScore: 30 })),
      row({ id: "old", appliedAt: at(-60).toISOString() }),
    ];
    const fb = feedbackFrom(rows, since);
    expect(fb.byPlatform.find((p) => p.platform === "StepStone")).toMatchObject({ applied: 6, responded: 3, responseRate: 0.5 });
    expect(fb.medianDaysToResponse).toBe(6);
    expect(fb.fitBands.map((b) => b.band)).toEqual(["under 40", "65 and up"]);

    const advice = ruleAdvice({ feedback: { ...fb, weekTargetHitRate: 0.3 }, waitingReady: 4, settings: normaliseJobHunt({}) });
    expect(advice.some((a) => a.startsWith("StepStone answers 3×"))).toBe(true);
    expect(advice.some((a) => a.includes("about 6 days"))).toBe(true);
    expect(advice.some((a) => a.includes("30% of your daily targets"))).toBe(true);
    expect(advice.length).toBeLessThanOrEqual(5);
  });

  it("stays quiet on small samples", () => {
    const fb = feedbackFrom([row({ platform: "StepStone", responded: true }), row({ platform: "LinkedIn" })], since);
    const advice = ruleAdvice({ feedback: fb, waitingReady: 0, settings: normaliseJobHunt({ enabled: true }) });
    expect(advice.some((a) => a.includes("as often as"))).toBe(false);
  });
});

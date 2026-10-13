import { describe, expect, it } from "vitest";
import { leadFilter, leadView, parseLeadQuery } from "./leads";
import { pickForAutoPrepare } from "./autoPrepare";
import { correctionFromAnswers } from "./prepare";
import { normaliseJobHunt } from "./settings";
import type { LeadSummary } from "./leads";

describe("lead queries", () => {
  it("defaults to open leads sorted by fit", () => {
    const q = parseLeadQuery(new URLSearchParams());
    expect(q).toMatchObject({ status: "open", sort: "fit", minFit: 0 });
    const f = leadFilter("u1", q);
    expect(f.status).toMatchObject({ $in: expect.arrayContaining(["new", "ready"]) });
  });

  it("filters by platform bucket and escapes search", () => {
    const f = leadFilter("u1", parseLeadQuery(new URLSearchParams("platform=other&q=a.b&minFit=40&status=ready")));
    expect(f.platform).toEqual({ $nin: ["LinkedIn", "Xing", "StepStone"] });
    expect(f.status).toBe("ready");
    expect(f.fitScore).toEqual({ $gte: 40 });
    expect((f.$or as { company: { $regex: string } }[])[0].company.$regex).toBe("a\\.b");
  });

  it("ignores unknown statuses", () => {
    expect(leadFilter("u1", parseLeadQuery(new URLSearchParams("status=$where"))).status).toBeUndefined();
  });

  it("leadView shapes a raw row", () => {
    const v = leadView({ _id: "x1", company: "A", title: "B", status: "weird", fitScore: 55, postedAt: new Date("2026-10-12T00:00:00Z") });
    expect(v.status).toBe("new");
    expect(v.platform).toBe("Other");
    expect(v.postedAt).toBe("2026-10-12T00:00:00.000Z");
    expect(v.description).toBeUndefined();
  });
});

function summary(over: Partial<Record<"linkedin" | "xing" | "stepstone" | "other", { target: number; submitted: number; ready: number }>>): LeadSummary {
  const base = { target: 0, submitted: 0, ready: 0, fresh: 0 };
  return {
    date: "2026-10-13",
    platforms: {
      linkedin: { ...base, ...over.linkedin },
      xing: { ...base, ...over.xing },
      stepstone: { ...base, ...over.stepstone },
      other: { ...base, ...over.other },
    },
    totals: { fresh: 0, shortlisted: 0, ready: 0, applying: 0, submittedToday: 0, target: 0, failed: 0 },
    nextDeadline: null,
  };
}

describe("pickForAutoPrepare", () => {
  const candidates = [
    { _id: "s1", platform: "StepStone", fitScore: 90 },
    { _id: "s2", platform: "StepStone", fitScore: 70 },
    { _id: "s3", platform: "StepStone", fitScore: 40 },
    { _id: "l1", platform: "LinkedIn", fitScore: 80 },
    { _id: "c1", platform: "Company Website", fitScore: 95 },
  ];

  it("respects remaining targets, the cap and the fit floor", () => {
    const settings = normaliseJobHunt({ autoPrepareTop: 2, minFitForAutoPrepare: 50 });
    const picked = pickForAutoPrepare(candidates, settings, summary({
      stepstone: { target: 8, submitted: 1, ready: 0 },
      linkedin: { target: 5, submitted: 5, ready: 0 },
    }));
    expect(picked).toEqual(["s1", "s2"]);
  });

  it("does nothing when switched off", () => {
    expect(pickForAutoPrepare(candidates, normaliseJobHunt({}), summary({ stepstone: { target: 8, submitted: 0, ready: 0 } }))).toEqual([]);
  });

  it("counts other boards toward the other target", () => {
    const settings = normaliseJobHunt({ autoPrepareTop: 3, minFitForAutoPrepare: 0, dailyTargets: { other: 1 } });
    expect(pickForAutoPrepare(candidates, settings, summary({ other: { target: 1, submitted: 0, ready: 0 } }))).toEqual(["c1"]);
  });
});

describe("correctionFromAnswers", () => {
  it("turns answered gaps into a clarification", () => {
    expect(correctionFromAnswers([{ requirement: "Kubernetes", answer: "2 years on GKE" }, { requirement: "Go", answer: "" }]))
      .toBe("The candidate clarified their experience:\n- Kubernetes: 2 years on GKE");
    expect(correctionFromAnswers([])).toBe("");
  });
});

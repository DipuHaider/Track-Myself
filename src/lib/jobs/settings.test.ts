import { describe, expect, it } from "vitest";
import {
  JOB_HUNT_DEFAULTS, SCREENING_MAX, jobHuntView, mergeClientPatch, normaliseJobHunt, targetPlatformFor, totalTarget,
} from "./settings";

describe("normaliseJobHunt", () => {
  it("returns defaults for garbage", () => {
    expect(normaliseJobHunt(null)).toEqual(JOB_HUNT_DEFAULTS);
    expect(normaliseJobHunt("x")).toEqual(JOB_HUNT_DEFAULTS);
  });

  it("clamps targets and auto-prepare", () => {
    const s = normaliseJobHunt({ dailyTargets: { linkedin: 999, xing: -3, stepstone: "8" }, autoPrepareTop: 40 });
    expect(s.dailyTargets).toEqual({ linkedin: 50, xing: 0, stepstone: 8, other: 0 });
    expect(s.autoPrepareTop).toBe(10);
  });

  it("dedupes and caps screening answers", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ question: `Q${i}`, answer: "yes" }));
    const s = normaliseJobHunt({
      screeningAnswers: [{ question: "Work permit?", answer: "EU" }, { question: "work permit?", answer: "x" }, { question: "", answer: "y" }, ...many],
    });
    expect(s.screeningAnswers[0]).toEqual({ question: "Work permit?", answer: "EU" });
    expect(s.screeningAnswers).toHaveLength(SCREENING_MAX);
  });

  it("keeps only known webhook events", () => {
    const s = normaliseJobHunt({ webhook: { url: "https://x.example/h", events: ["lead.ready", "nope"] } });
    expect(s.webhook.events).toEqual(["lead.ready"]);
  });
});

describe("mergeClientPatch", () => {
  it("never lets the client set the sealed secret", () => {
    const current = normaliseJobHunt({ webhook: { sealed: { ciphertext: "c", iv: "i", tag: "t" }, last4: "abcd" } });
    const next = mergeClientPatch(current, { webhook: { sealed: null, last4: "zzzz", url: "https://n8n.example/w" } });
    expect(next.webhook.sealed).toEqual({ ciphertext: "c", iv: "i", tag: "t" });
    expect(next.webhook.last4).toBe("abcd");
    expect(next.webhook.url).toBe("https://n8n.example/w");
  });

  it("merges partial targets", () => {
    const next = mergeClientPatch(JOB_HUNT_DEFAULTS, { dailyTargets: { xing: 2 }, enabled: true });
    expect(next.dailyTargets).toEqual({ linkedin: 5, xing: 2, stepstone: 8, other: 0 });
    expect(next.enabled).toBe(true);
    expect(totalTarget(next)).toBe(15);
  });
});

describe("view and platform", () => {
  it("hides the sealed secret", () => {
    const v = jobHuntView(normaliseJobHunt({ webhook: { sealed: { ciphertext: "c", iv: "i", tag: "t" } } }));
    expect("sealed" in v.webhook).toBe(false);
    expect(v.webhook.hasSecret).toBe(true);
  });

  it("maps platforms to targets", () => {
    expect(targetPlatformFor("LinkedIn")).toBe("linkedin");
    expect(targetPlatformFor("StepStone")).toBe("stepstone");
    expect(targetPlatformFor("Xing")).toBe("xing");
    expect(targetPlatformFor("Company Website")).toBe("other");
  });
});

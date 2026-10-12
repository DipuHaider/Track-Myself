import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHARED_MODEL, MODEL_CATALOGUE, actualNano, estimateNano, modelSpec, sharedModelIds, usdToNano,
} from "@/lib/ai/models";

describe("model catalogue", () => {
  it("prices every model in whole nano-dollars", () => {
    for (const spec of Object.values(MODEL_CATALOGUE)) {
      expect(Number.isInteger(spec.inputNanoPerToken)).toBe(true);
      expect(Number.isInteger(spec.outputNanoPerToken)).toBe(true);
    }
    expect(usdToNano(9)).toBe(9_000_000_000);
  });

  it("exposes the shared default and hides the superadmin Gemini from shared ids", () => {
    expect(modelSpec(DEFAULT_SHARED_MODEL)?.availability).toBe("shared");
    expect(sharedModelIds()).toContain(DEFAULT_SHARED_MODEL);
    expect(sharedModelIds().some((id) => id.startsWith("gemini"))).toBe(false);
  });
});

describe("cost estimates", () => {
  it("reserves at least what a full-length answer would cost", () => {
    const spec = modelSpec(DEFAULT_SHARED_MODEL)!;
    const prompt = "x".repeat(4000);
    const est = estimateNano(spec, prompt, 1000);
    expect(est).toBeGreaterThanOrEqual(actualNano(spec, 1000, 1000));
  });

  it("charges nothing for unfunded models", () => {
    const spec = { ...modelSpec(DEFAULT_SHARED_MODEL)!, funded: false };
    expect(estimateNano(spec, "hello", 500)).toBe(0);
    expect(actualNano(spec, 10, 10)).toBe(0);
  });
});

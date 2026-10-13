import { describe, expect, it } from "vitest";
import { fitScore } from "./score";
import type { CVContent } from "@/types/cv";

const cv = {
  summary: "Frontend developer building React and TypeScript apps with Next.js",
  positioning: "Frontend Developer",
  skills: [{ label: "Tech", items: "React, TypeScript, Next.js, Tailwind, Node.js" }],
  experience: [], education: [],
} as unknown as CVContent;

describe("fitScore", () => {
  it("ranks a matching posting above an unrelated one", () => {
    const good = fitScore(cv, "Frontend Developer (m/w/d)", "Wir suchen React und TypeScript Erfahrung mit Next.js und Tailwind.");
    const bad = fitScore(cv, "Steuerfachangestellte (m/w/d)", "Buchhaltung, DATEV, Lohnabrechnung und Jahresabschluss.");
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.score).toBeGreaterThanOrEqual(50);
    expect(bad.score).toBeLessThan(30);
    expect(good.matched).toContain("react");
  });

  it("stays within 0..100 and handles empties", () => {
    expect(fitScore(cv, "", "").score).toBe(0);
    const s = fitScore(cv, "React React", "react ".repeat(500)).score;
    expect(s).toBeLessThanOrEqual(100);
  });
});

import { describe, expect, it } from "vitest";
import { htmlToText, leadPlatform, matchKeyFor, platformFromUrl, toLeadDraft, withinAge } from "./normalise";

const now = new Date("2026-10-13T08:00:00Z");

describe("platformFromUrl", () => {
  it("maps the boards", () => {
    expect(platformFromUrl("https://www.linkedin.com/jobs/view/123")).toBe("LinkedIn");
    expect(platformFromUrl("https://www.xing.com/jobs/hamburg-dev-123456")).toBe("Xing");
    expect(platformFromUrl("https://www.stepstone.de/stellenangebote--x--1234567-inline.html")).toBe("StepStone");
    expect(platformFromUrl("https://de.indeed.com/viewjob?jk=abc")).toBe("Indeed");
    expect(platformFromUrl("https://www.arbeitsagentur.de/jobsuche/jobdetail/1")).toBe("Other");
    expect(platformFromUrl("https://www.adzuna.de/land/ad/1")).toBe("Other");
    expect(platformFromUrl("https://careers.example.com/1")).toBe("Company Website");
    expect(platformFromUrl("nope")).toBe("Other");
  });

  it("prefers the board you would apply on", () => {
    expect(leadPlatform("https://www.arbeitsagentur.de/x", "https://www.stepstone.de/stellenangebote--a--1234567-inline.html")).toBe("StepStone");
    expect(leadPlatform("https://www.linkedin.com/jobs/view/1", "https://careers.example.com/apply")).toBe("LinkedIn");
    expect(leadPlatform("https://www.arbeitsagentur.de/x", "https://careers.example.com/apply")).toBe("Company Website");
  });
});

describe("toLeadDraft", () => {
  it("builds identity, key and platform", () => {
    const d = toLeadDraft({
      source: "ba", externalId: "10001-1-S", title: " Frontend  Developer (m/w/d) ", company: "Beispiel GmbH",
      location: "Hamburg, Germany", url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/10001-1-S",
      postedAt: new Date("2026-10-12T08:00:00Z"), description: "<p>React &amp; TypeScript</p>",
    }, now)!;
    expect(d.title).toBe("Frontend Developer (m/w/d)");
    expect(d.identity).toBe("ba:10001-1-S");
    expect(d.matchKey).toBe(matchKeyFor("Beispiel", "Frontend Developer (m/w/d)"));
    expect(d.description).toBe("React & TypeScript");
    expect(d.city).toBe("Hamburg");
  });

  it("rejects missing basics and future dates", () => {
    expect(toLeadDraft({ source: "ba", externalId: "", title: "x", company: "y", url: "https://a.de" }, now)).toBeNull();
    const d = toLeadDraft({ source: "manual", externalId: "1", title: "x", company: "y", url: "https://a.de", postedAt: new Date("2027-01-01") }, now)!;
    expect(d.postedAt).toBeNull();
  });
});

describe("helpers", () => {
  it("htmlToText keeps list structure", () => {
    expect(htmlToText("<ul><li>A</li><li>B</li></ul>")).toContain("• A");
  });

  it("withinAge", () => {
    expect(withinAge(new Date("2026-10-10T08:00:00Z"), 3, now)).toBe(true);
    expect(withinAge(new Date("2026-10-06T08:00:00Z"), 3, now)).toBe(false);
    expect(withinAge(null, 3, now)).toBe(true);
  });
});

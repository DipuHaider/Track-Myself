import { describe, expect, it } from "vitest";
import baList from "./__fixtures__/ba-list.json";
import baDetailJson from "./__fixtures__/ba-detail.json";
import adzunaJson from "./__fixtures__/adzuna.json";
import { detailUrl, parseBaDetail, parseBaList } from "./ba";
import { parseAdzuna } from "./adzuna";

describe("Bundesagentur parser", () => {
  it("reads the v6 list shape", () => {
    const leads = parseBaList(baList);
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({
      source: "ba",
      externalId: "10001-1003306737-S",
      company: "ADS Allg Deutsche Steuerberatung mbH",
      location: "Hamburg, Germany",
      url: detailUrl("10001-1003306737-S"),
      remote: true,
    });
    expect(leads[0].postedAt?.toISOString().slice(0, 10)).toBe("2026-10-06");
    expect(leads[1].applyUrl).toContain("finest-jobs.com");
  });

  it("reads the detail shape", () => {
    const d = parseBaDetail(baDetailJson);
    expect(d.description?.length ?? 0).toBeGreaterThan(50);
    expect(d.applyUrl).toContain("finest-jobs.com");
  });

  it("tolerates garbage", () => {
    expect(parseBaList(null)).toEqual([]);
    expect(parseBaList({ ergebnisliste: [{ titel: "x" }] })).toEqual([]);
  });
});

describe("Adzuna parser", () => {
  it("parses results, strips markup, hides predicted salaries", () => {
    const leads = parseAdzuna(adzunaJson);
    expect(leads).toHaveLength(2);
    expect(leads[0].title).toBe("Frontend Developer (m/w/d)");
    expect(leads[0].salary).toContain("–");
    expect(leads[1].salary).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  hasAnyFilter,
  parseFilters,
  toApiQuery,
  toSearchParams,
  type ApplicationFilters,
} from "@/lib/applicationQuery";

describe("parseFilters", () => {
  it("returns defaults for an empty query", () => {
    expect(parseFilters(new URLSearchParams(""))).toEqual(DEFAULT_FILTERS);
  });

  it("drops an invalid status, flag, sort, priority, type and tab", () => {
    const parsed = parseFilters(
      new URLSearchParams("status=Hired&flag=bogus&sort=salary&priority=Urgent&type=Gig&tab=notes"),
    );
    expect(parsed.status).toBe("");
    expect(parsed.flag).toBe("");
    expect(parsed.sort).toBe("createdAt");
    expect(parsed.priority).toBe("");
    expect(parsed.type).toBe("");
    expect(parsed.tab).toBe("");
  });

  it("keeps valid values", () => {
    const parsed = parseFilters(
      new URLSearchParams("status=Submitted&flag=duplicate&sort=companyName&priority=High&type=Remote&tab=interviews"),
    );
    expect(parsed).toMatchObject({
      status: "Submitted", flag: "duplicate", sort: "companyName", priority: "High", type: "Remote", tab: "interviews",
    });
  });

  it("clamps page and validates open ids", () => {
    expect(parseFilters(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseFilters(new URLSearchParams("page=abc")).page).toBe(1);
    expect(parseFilters(new URLSearchParams("page=4")).page).toBe(4);
    expect(parseFilters(new URLSearchParams("open=not-an-id")).open).toBe("");
    expect(parseFilters(new URLSearchParams("open=507f1f77bcf86cd799439011")).open).toBe("507f1f77bcf86cd799439011");
  });

  it("trims and caps the search text", () => {
    expect(parseFilters(new URLSearchParams("q=  acme  ")).q).toBe("acme");
    expect(parseFilters(new URLSearchParams(`q=${"x".repeat(200)}`)).q).toHaveLength(120);
  });
});

describe("toSearchParams", () => {
  it("round-trips a full filter set", () => {
    const filters: ApplicationFilters = {
      q: "acme",
      status: "Rejected",
      priority: "Low",
      type: "Hybrid",
      flag: "warm",
      sort: "updatedAt",
      page: 3,
      open: "507f1f77bcf86cd799439011",
      tab: "interviews",
    };
    expect(parseFilters(toSearchParams(filters))).toEqual(filters);
  });

  it("omits defaults so the URL stays clean", () => {
    expect(toSearchParams(DEFAULT_FILTERS).toString()).toBe("");
    expect(toSearchParams({ ...DEFAULT_FILTERS, page: 1, sort: "createdAt" }).toString()).toBe("");
  });
});

describe("toApiQuery", () => {
  it("maps the favourite flag to the API parameter and passes priority and type through", () => {
    const url = toApiQuery({ ...DEFAULT_FILTERS, flag: "favourite", priority: "High", type: "Remote" }, 20);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/api/applications?")).toBe(true);
    expect(params.get("favourite")).toBe("1");
    expect(params.get("flag")).toBeNull();
    expect(params.get("priority")).toBe("High");
    expect(params.get("type")).toBe("Remote");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("20");
  });

  it("passes server-side filters through", () => {
    const params = new URLSearchParams(
      toApiQuery({ ...DEFAULT_FILTERS, q: "acme", status: "Submitted", flag: "ghost-auto", sort: "companyName", page: 2 }, 25).split("?")[1],
    );
    expect(params.get("q")).toBe("acme");
    expect(params.get("status")).toBe("Submitted");
    expect(params.get("flag")).toBe("ghost-auto");
    expect(params.get("sort")).toBe("companyName");
    expect(params.get("page")).toBe("2");
  });
});

describe("active filter counting", () => {
  it("counts narrowing filters but not search, sort or page", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...DEFAULT_FILTERS, q: "x", sort: "updatedAt", page: 2 })).toBe(0);
    expect(countActiveFilters({ ...DEFAULT_FILTERS, status: "Submitted", flag: "duplicate" })).toBe(2);
    expect(hasAnyFilter({ ...DEFAULT_FILTERS, q: "x" })).toBe(true);
    expect(hasAnyFilter(DEFAULT_FILTERS)).toBe(false);
  });
});

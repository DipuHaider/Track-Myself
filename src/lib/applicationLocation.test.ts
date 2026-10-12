import { describe, expect, it } from "vitest";
import { formatLocation, splitLocation } from "@/lib/applicationLocation";

describe("splitLocation", () => {
  it("splits city and country from free text", () => {
    expect(splitLocation("Berlin, Berlin, Germany")).toMatchObject({ city: "Berlin", country: "Germany" });
    expect(splitLocation("Hamburg, DE")).toMatchObject({ city: "Hamburg", country: "Germany" });
    expect(splitLocation("Remote in London")).toMatchObject({ city: "London" });
    expect(splitLocation("Austin, TX")).toMatchObject({ city: "Austin", country: "United States" });
    expect(splitLocation("Remote")).toEqual({ city: "", country: "", label: "" });
  });
});

describe("formatLocation", () => {
  it("prefers city/country and falls back to the legacy field", () => {
    expect(formatLocation({ city: "Dhaka", country: "Bangladesh" })).toBe("Dhaka, Bangladesh");
    expect(formatLocation({ city: "", country: "", location: "Somewhere" })).toBe("Somewhere");
    expect(formatLocation({ city: "Berlin", country: "Berlin" })).toBe("Berlin");
  });
});

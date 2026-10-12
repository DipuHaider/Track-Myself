import { describe, expect, it } from "vitest";
import { clientIp, clientIpFromHeaders } from "@/lib/rateLimit";

function headers(map: Record<string, string>) {
  return (name: string) => map[name.toLowerCase()] ?? null;
}

describe("clientIpFromHeaders", () => {
  it("prefers the platform-set headers over x-forwarded-for", () => {
    expect(clientIpFromHeaders(headers({ "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIpFromHeaders(headers({ "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("8.8.8.8");
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIpFromHeaders(headers({}))).toBe("unknown");
  });

  it("reads a Request the same way", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "7.7.7.7" } });
    expect(clientIp(req)).toBe("7.7.7.7");
  });
});

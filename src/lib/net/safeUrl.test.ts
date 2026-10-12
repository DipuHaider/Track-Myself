import { beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.fn();
vi.mock("node:dns", () => ({ default: { promises: { lookup: (...args: unknown[]) => lookup(...args) } } }));

import { assertSafeBaseUrl, isPrivateAddress } from "@/lib/net/safeUrl";

describe("isPrivateAddress", () => {
  it.each([
    ["127.0.0.1", true], ["10.1.2.3", true], ["169.254.169.254", true], ["172.16.5.5", true],
    ["192.168.0.1", true], ["100.64.0.1", true], ["::1", true], ["fe80::1", true], ["fd00::1", true],
    ["::ffff:10.0.0.1", true], ["8.8.8.8", false], ["2606:4700::1111", false],
  ])("%s → %s", (ip, expected) => {
    expect(isPrivateAddress(ip)).toBe(expected);
  });
});

describe("assertSafeBaseUrl", () => {
  beforeEach(() => {
    lookup.mockReset();
    lookup.mockResolvedValue([{ address: "104.18.1.1", family: 4 }]);
    vi.stubEnv("AI_BASEURL_ALLOWLIST", "");
  });

  it("accepts a public https host and normalises the path", async () => {
    await expect(assertSafeBaseUrl("https://api.openai.com/v1/")).resolves.toEqual({ ok: true, url: "https://api.openai.com/v1" });
  });

  it.each([
    "http://api.openai.com/v1",
    "https://169.254.169.254/latest",
    "https://user:pw@api.x.com",
    "https://api.x.com:8443/v1",
    "https://localhost/v1",
    "https://router.internal/v1",
    "not a url",
  ])("rejects %s", async (raw) => {
    const r = await assertSafeBaseUrl(raw);
    expect(r.ok).toBe(false);
  });

  it("rejects a public name that resolves to a private address", async () => {
    lookup.mockResolvedValue([{ address: "104.18.1.1", family: 4 }, { address: "10.0.0.5", family: 4 }]);
    const r = await assertSafeBaseUrl("https://evil.example.com/v1");
    expect(r.ok).toBe(false);
  });

  it("honours the allowlist", async () => {
    vi.stubEnv("AI_BASEURL_ALLOWLIST", "openrouter.ai, api.groq.com");
    expect((await assertSafeBaseUrl("https://openrouter.ai/api/v1")).ok).toBe(true);
    expect((await assertSafeBaseUrl("https://api.together.xyz/v1")).ok).toBe(false);
  });
});

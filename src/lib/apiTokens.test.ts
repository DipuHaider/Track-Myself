import { beforeEach, describe, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  token: null as Record<string, unknown> | null,
  user: null as Record<string, unknown> | null,
  rateOk: true,
  featureOn: false,
}));

vi.mock("@/lib/db", () => ({ default: async () => undefined }));
vi.mock("@/models/ApiToken", () => ({
  API_SCOPES: ["leads:read", "leads:write", "hunt:run", "prepare", "applications:read", "applications:write", "report:read"],
  default: {
    findOne: () => ({ lean: async () => s.token }),
    updateOne: async () => ({}),
  },
}));
vi.mock("@/models/User", () => ({ default: { findById: () => ({ lean: async () => s.user }) } }));
vi.mock("@/lib/rateLimitStore", () => ({ checkRateLimitDb: async () => ({ ok: s.rateOk, retryAfterSeconds: 30, remaining: 0 }) }));
vi.mock("@/lib/appSettings", () => ({ getAppSettings: async () => ({ features: { jobHunt: s.featureOn } }) }));

import { authenticateToken, hashToken, newTokenSecret, normaliseScopes, TOKEN_PREFIX } from "./apiTokens";
import { NextResponse } from "next/server";

const req = (token?: string) => new Request("https://x/api/v1/leads", { headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  s.token = { _id: "t1", userId: "u1", scopes: ["leads:read"], revokedAt: null, expiresAt: null, lastUsedAt: new Date() };
  s.user = { role: "superadmin", plan: "free", status: "active", email: "a@b.cd" };
  s.rateOk = true;
  s.featureOn = false;
});

describe("token helpers", () => {
  it("creates prefixed secrets and stable hashes", () => {
    const t = newTokenSecret();
    expect(t.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(hashToken(newTokenSecret()));
  });

  it("keeps only known scopes", () => {
    expect(normaliseScopes(["leads:read", "admin", 3])).toEqual(["leads:read"]);
    expect(normaliseScopes("x")).toEqual([]);
  });
});

describe("authenticateToken", () => {
  const status = async (r: Awaited<ReturnType<typeof authenticateToken>>) => (r instanceof NextResponse ? r.status : 200);

  it("accepts a valid token with the scope", async () => {
    const r = await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read");
    expect(r instanceof NextResponse).toBe(false);
    expect((r as { id: string }).id).toBe("u1");
  });

  it("rejects missing, malformed, revoked and expired tokens", async () => {
    expect(await status(await authenticateToken(req(), "leads:read"))).toBe(401);
    expect(await status(await authenticateToken(req("not-a-pat"), "leads:read"))).toBe(401);
    s.token = { ...s.token, revokedAt: new Date() };
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(401);
    s.token = { ...s.token, revokedAt: null, expiresAt: new Date(Date.now() - 1000) };
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(401);
  });

  it("enforces scope, pause, entitlement and rate", async () => {
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "prepare"))).toBe(403);
    s.user = { ...s.user, status: "paused" };
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(423);
    s.user = { role: "free", plan: "premium", status: "active" };
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(403);
    s.featureOn = true;
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(200);
    s.rateOk = false;
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(429);
  });

  it("rejects tokens whose account is being deleted", async () => {
    s.user = { ...s.user, deletingAt: new Date() };
    expect(await status(await authenticateToken(req(`${TOKEN_PREFIX}abc`), "leads:read"))).toBe(401);
  });
});

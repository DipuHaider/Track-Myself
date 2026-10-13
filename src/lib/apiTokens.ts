import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ApiToken, { API_SCOPES, type ApiScope } from "@/models/ApiToken";
import User from "@/models/User";
import { checkRateLimitDb } from "@/lib/rateLimitStore";
import { tooMany } from "@/lib/api/respond";
import { canUseJobHunt, type Role } from "@/lib/permissions";
import { getAppSettings } from "@/lib/appSettings";
import type { SessionUser } from "@/lib/serverAuth";

export const TOKEN_PREFIX = "tm_pat_";
export const TOKEN_LIMIT = 10;
const USE_RATE = { limit: 120, windowMs: 60 * 1000 };
const TOUCH_EVERY_MS = 5 * 60 * 1000;

export const SCOPE_LABELS: Record<ApiScope, string> = {
  "leads:read": "Read job leads",
  "leads:write": "Add, shortlist and dismiss leads",
  "hunt:run": "Run the job search",
  prepare: "Prepare CVs and cover letters (uses AI)",
  "applications:read": "Read applications",
  "applications:write": "Update application status and notes",
  "report:read": "Read the daily report and insights",
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newTokenSecret(): string {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function normaliseScopes(raw: unknown): ApiScope[] {
  if (!Array.isArray(raw)) return [];
  return API_SCOPES.filter((s) => raw.includes(s));
}

export async function createToken(userId: string, name: string, scopes: ApiScope[], expiresInDays: number | null) {
  await dbConnect();
  const token = newTokenSecret();
  const row = await ApiToken.create({
    userId,
    name: name.trim().slice(0, 60) || "Automation",
    scopes,
    hash: hashToken(token),
    last4: token.slice(-4),
    expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
  });
  return { token, row };
}

export type TokenUser = SessionUser & { tokenId: string; scopes: ApiScope[] };

const unauthorized = (msg = "Unauthorized") =>
  NextResponse.json({ error: msg }, { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="trackmyself"' } });

/* Personal access tokens authenticate the automation API only. The token is
   looked up by its hash, so a database leak does not leak usable tokens; the
   account behind it must still exist, be active and be entitled to job hunt
   on every call, so pausing, downgrading or deleting an account stops its
   automations immediately. */
export async function authenticateToken(req: Request, scope: ApiScope): Promise<TokenUser | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(TOKEN_PREFIX) || token.length > 100) return unauthorized();

  await dbConnect();
  const row = (await ApiToken.findOne({ hash: hashToken(token) }).lean()) as
    | { _id: { toString(): string }; userId: { toString(): string }; scopes: string[]; revokedAt?: Date | null; expiresAt?: Date | null; lastUsedAt?: Date | null }
    | null;
  if (!row || row.revokedAt) return unauthorized();
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return unauthorized("Token expired");

  const tokenId = row._id.toString();
  const gate = await checkRateLimitDb({ key: `pat:${tokenId}`, ...USE_RATE });
  if (!gate.ok) return tooMany(gate, "Too many requests for this token.");

  if (!row.scopes.includes(scope)) {
    return NextResponse.json({ error: `This token lacks the "${scope}" scope.` }, { status: 403 });
  }

  const user = (await User.findById(row.userId, "role plan status email deletingAt").lean()) as
    | { role: Role; plan?: string; status?: string; email?: string; deletingAt?: Date | null }
    | null;
  if (!user || user.deletingAt) return unauthorized();
  if (user.status === "paused") {
    return NextResponse.json({ error: "The account is paused.", status: "paused" }, { status: 423 });
  }
  const settings = await getAppSettings();
  if (!canUseJobHunt(user.role, user.plan, settings.features.jobHunt)) {
    return NextResponse.json({ error: "Job hunt is not available on this account's plan." }, { status: 403 });
  }

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await ApiToken.updateOne({ _id: row._id }, { $set: { lastUsedAt: new Date() } }).catch(() => undefined);
  }

  return {
    id: row.userId.toString(),
    role: user.role,
    plan: user.plan === "premium" ? "premium" : "free",
    status: "active",
    email: user.email,
    tokenId,
    scopes: row.scopes as ApiScope[],
  };
}

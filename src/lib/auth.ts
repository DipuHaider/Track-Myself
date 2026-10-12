import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { SUPERADMIN_EMAILS, isPremiumRole, type AccountStatus, type Plan } from "@/lib/permissions";
import { checkRateLimitDb, clearRateLimitDb } from "@/lib/rateLimitStore";
import { clientIpFromHeaders } from "@/lib/rateLimit";
import { normaliseEmail } from "@/lib/emailAddress";
import { isVerified } from "@/lib/verified";
import EmailVerificationToken from "@/models/EmailVerificationToken";

/* Compared against when the email is unknown or has no password, so a wrong
   email and a wrong password take the same time to answer. */
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8gDgyHz9xd6g0Yz2wqX7l6gq7VQ8y2";

export const CLAIMS_TTL_MS = 5 * 60 * 1000;

export const IDLE_TIMEOUT_SECONDS = 12 * 60 * 60;
export const ABSOLUTE_TIMEOUT_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_REFRESH_SECONDS = 15 * 60;
export const EXTENSION_TOKEN_SECONDS = 7 * 24 * 60 * 60;

type ClaimSource = {
  _id: { toString(): string }; email: string; role: string; plan?: string; image?: string; status?: string;
  password?: string; emailVerifiedAt?: Date | null;
};

type CachedClaims = { id: string; role: string; plan: Plan; image?: string; status: AccountStatus; at: number };

const claimsCache = new Map<string, CachedClaims>();

export function invalidateClaims(email?: string | null) {
  if (email) claimsCache.delete(normaliseEmail(email));
}

type ClaimsResult =
  | { kind: "ok"; claims: CachedClaims }
  | { kind: "missing" }
  | { kind: "unavailable" };

async function loadClaims(rawEmail: string, force: boolean): Promise<ClaimsResult> {
  const email = normaliseEmail(rawEmail);
  const cached = claimsCache.get(email);
  if (!force && cached && Date.now() - cached.at < CLAIMS_TTL_MS) return { kind: "ok", claims: cached };

  let dbUser: ClaimSource | null;
  try {
    await dbConnect();
    dbUser = (await User.findOne(
      { email },
      "email role plan image status password emailVerifiedAt",
    ).lean()) as ClaimSource | null;
  } catch {
    return cached ? { kind: "ok", claims: cached } : { kind: "unavailable" };
  }

  if (!dbUser) {
    claimsCache.delete(email);
    return { kind: "missing" };
  }

  const role = effectiveRole(dbUser.email, dbUser.role, isVerified(dbUser));
  const claims: CachedClaims = {
    id: dbUser._id.toString(),
    role,
    plan: effectivePlan(role, dbUser.plan),
    image: dbUser.image,
    status: dbUser.status === "paused" ? "paused" : "active",
    at: Date.now(),
  };
  claimsCache.set(email, claims);
  return { kind: "ok", claims };
}

type Presence = { status: AccountStatus; sessionsValidFrom: number } | null;

export async function loadPresence(userId: string, fallback: AccountStatus): Promise<Presence> {
  try {
    await dbConnect();
    const row = (await User.findById(userId, "status sessionsValidFrom").lean()) as
      | { status?: string; sessionsValidFrom?: Date | null }
      | null;
    if (!row) return null;
    return {
      status: row.status === "paused" ? "paused" : "active",
      sessionsValidFrom: row.sessionsValidFrom ? new Date(row.sessionsValidFrom).getTime() : 0,
    };
  } catch {
    return { status: fallback, sessionsValidFrom: 0 };
  }
}

/* The hard-coded superadmin addresses only count once the inbox has been
   proven. Otherwise registering one of them first would hand over the platform. */
export function effectiveRole(email: string, dbRole: string, verified = true): string {
  if (verified && SUPERADMIN_EMAILS.includes(normaliseEmail(email) as (typeof SUPERADMIN_EMAILS)[number])) {
    return "superadmin";
  }
  return dbRole ?? "free";
}

export function effectivePlan(role: string, dbPlan?: string): Plan {
  if (isPremiumRole(role)) return "premium";
  return dbPlan === "premium" ? "premium" : "free";
}

function endSession(token: JWT): JWT {
  token.id = undefined;
  token.role = undefined;
  token.plan = undefined;
  token.status = undefined;
  token.picture = undefined;
  token.claimsAt = Date.now();
  return token;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: { email?: string; password?: string } | undefined, req) {
        await dbConnect();
        if (!credentials?.email || !credentials.password) return null;

        const email = normaliseEmail(credentials.email);
        const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
        const ip = clientIpFromHeaders((name) => {
          const v = headers[name] ?? headers[name.toLowerCase()];
          return Array.isArray(v) ? v[0] ?? null : v ?? null;
        });

        const throttleKey = `login:${email}`;
        const window = { windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 };
        const [gate, ipGate] = await Promise.all([
          checkRateLimitDb({ key: throttleKey, limit: 8, ...window }),
          checkRateLimitDb({ key: `login-ip:${ip}`, limit: 30, ...window }),
        ]);
        if (!gate.ok || !ipGate.ok) return null;

        const user = await User.findOne({ email });
        if (!user || !user.password) {
          await bcrypt.compare(credentials.password, DUMMY_HASH);
          return null;
        }

        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) return null;

        if (!isVerified(user)) throw new Error("unverified");

        await clearRateLimitDb(throttleKey);

        const role = effectiveRole(user.email, user.role, true);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role,
          plan: effectivePlan(role, user.plan),
          status: user.status === "paused" ? "paused" : "active",
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge:    IDLE_TIMEOUT_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
  },
  jwt: {
    maxAge: IDLE_TIMEOUT_SECONDS,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = normaliseEmail(user.email);
        if (!email) return false;
        if ((profile as { email_verified?: boolean } | undefined)?.email_verified === false) return false;

        await dbConnect();
        const existing = await User.findOne({ email });
        if (!existing) {
          await User.create({
            name: user.name ?? "Google User",
            email,
            googleId: user.id,
            image: user.image ?? "",
            role: "free",
            plan: "free",
            emailVerifiedAt: new Date(),
          });
          return true;
        }

        /* Google has just proven this inbox. A password row that never verified
           was set by whoever typed the address first — possibly not the owner —
           so it is replaced rather than linked, and every token for it is voided. */
        if (existing.password && existing.emailVerifiedAt === null) {
          existing.password = undefined;
          existing.sessionsValidFrom = new Date();
          await EmailVerificationToken.updateMany({ userId: existing._id, usedAt: null }, { usedAt: new Date() });
        }

        let dirty = false;
        if (!existing.googleId) { existing.googleId = user.id; dirty = true; }
        if (!existing.emailVerifiedAt) { existing.emailVerifiedAt = new Date(); dirty = true; }
        if (user.image && existing.image !== user.image) { existing.image = user.image; dirty = true; }
        if (dirty || existing.isModified()) {
          await existing.save();
          invalidateClaims(existing.email);
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (token.aud === "extension") return endSession(token);

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.plan = user.plan ?? "free";
        token.status = user.status ?? "active";
        token.claimsAt = Date.now();
        token.sessionStart = Date.now();
        if (token.email) {
          await User.updateOne({ email: normaliseEmail(token.email) }, { $set: { lastLoginAt: new Date() } }).catch(() => {});
        }
      }

      if (!token.sessionStart) {
        token.sessionStart = token.iat ? token.iat * 1000 : Date.now();
      }

      if (Date.now() - token.sessionStart > ABSOLUTE_TIMEOUT_SECONDS * 1000) {
        return endSession(token);
      }

      const stale = !token.claimsAt || Date.now() - token.claimsAt > CLAIMS_TTL_MS;
      const refresh =
        trigger === "update" ||
        account?.provider === "google" ||
        token.plan === undefined ||
        stale;

      if (refresh && token.email) {
        const result = await loadClaims(
          token.email,
          trigger === "update" || account?.provider === "google",
        );

        if (result.kind === "missing") {
          return endSession(token);
        }

        if (result.kind === "ok") {
          const { claims } = result;
          token.id = claims.id;
          token.role = claims.role;
          token.plan = claims.plan;
          token.status = claims.status;
          token.picture = claims.image || undefined;
        }
        token.claimsAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id || !token.role) {
        return null as unknown as typeof session;
      }

      const tokenStatus = (token.status as AccountStatus | undefined) ?? "active";
      const presence = await loadPresence(token.id, tokenStatus);
      if (!presence) {
        return null as unknown as typeof session;
      }

      const startedAt = token.sessionStart ?? (token.iat ? token.iat * 1000 : 0);
      if (presence.sessionsValidFrom && startedAt < presence.sessionsValidFrom) {
        return null as unknown as typeof session;
      }

      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.plan = (token.plan as Plan | undefined) ?? "free";
        session.user.image = token.picture ?? null;
        session.user.status = presence.status;
      }
      return session;
    },
  },
};

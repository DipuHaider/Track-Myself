import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { SUPERADMIN_EMAILS, isPremiumRole, type AccountStatus, type Plan } from "@/lib/permissions";
import { checkRateLimit, clearRateLimit } from "@/lib/rateLimit";

export const CLAIMS_TTL_MS = 5 * 60 * 1000;

type ClaimSource = { _id: { toString(): string }; email: string; role: string; plan?: string; image?: string; status?: string };

type CachedClaims = { id: string; role: string; plan: Plan; image?: string; status: AccountStatus; at: number };

const claimsCache = new Map<string, CachedClaims>();

export function invalidateClaims(email?: string | null) {
  if (email) claimsCache.delete(email);
}

type ClaimsResult =
  | { kind: "ok"; claims: CachedClaims }
  | { kind: "missing" }
  | { kind: "unavailable" };

async function loadClaims(email: string, force: boolean): Promise<ClaimsResult> {
  const cached = claimsCache.get(email);
  if (!force && cached && Date.now() - cached.at < CLAIMS_TTL_MS) return { kind: "ok", claims: cached };

  let dbUser: ClaimSource | null;
  try {
    await dbConnect();
    dbUser = (await User.findOne(
      { email },
      "email role plan image status",
    ).lean()) as ClaimSource | null;
  } catch {
    return cached ? { kind: "ok", claims: cached } : { kind: "unavailable" };
  }

  if (!dbUser) {
    claimsCache.delete(email);
    return { kind: "missing" };
  }

  const role = effectiveRole(dbUser.email, dbUser.role);
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

type Presence = { status: AccountStatus } | null;

export async function loadPresence(userId: string, fallback: AccountStatus): Promise<Presence> {
  try {
    await dbConnect();
    const row = (await User.findById(userId, "status").lean()) as { status?: string } | null;
    if (!row) return null;
    return { status: row.status === "paused" ? "paused" : "active" };
  } catch {
    return { status: fallback };
  }
}

export function effectiveRole(email: string, dbRole: string): string {
  if (SUPERADMIN_EMAILS.includes(email as (typeof SUPERADMIN_EMAILS)[number])) return "superadmin";
  return dbRole ?? "free";
}

export function effectivePlan(role: string, dbPlan?: string): Plan {
  if (isPremiumRole(role)) return "premium";
  return dbPlan === "premium" ? "premium" : "free";
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
      async authorize(credentials: { email?: string; password?: string } | undefined) {
        await dbConnect();
        if (!credentials?.email || !credentials.password) return null;

        const throttleKey = `login:${credentials.email.toLowerCase().trim()}`;
        const gate = checkRateLimit({
          key: throttleKey,
          limit: 8,
          windowMs: 15 * 60 * 1000,
          blockMs: 15 * 60 * 1000,
        });
        if (!gate.ok) return null;

        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.password) return null;

        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) return null;

        clearRateLimit(throttleKey);

        const role = effectiveRole(user.email, user.role);

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
    maxAge:    30 * 24 * 3600,
    updateAge: 24 * 3600,
  },
  jwt: {
    maxAge: 30 * 24 * 3600,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await dbConnect();
        const existing = await User.findOne({ email: user.email });
        if (!existing) {
          await User.create({
            name: user.name ?? "Google User",
            email: user.email,
            googleId: user.id,
            image: user.image ?? "",
            role: "free",
            plan: "free",
          });
        } else {
          let dirty = false;
          if (!existing.googleId) { existing.googleId = user.id; dirty = true; }
          if (user.image && existing.image !== user.image) { existing.image = user.image; dirty = true; }
          if (dirty) {
            await existing.save();
            invalidateClaims(existing.email);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.plan = user.plan ?? "free";
        token.status = user.status ?? "active";
        token.claimsAt = Date.now();
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
          token.id = undefined;
          token.role = undefined;
          token.plan = undefined;
          token.status = undefined;
          token.picture = undefined;
          token.claimsAt = Date.now();
          return token;
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

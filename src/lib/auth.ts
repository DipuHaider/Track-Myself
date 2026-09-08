import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { SUPERADMIN_EMAILS, isPremiumRole, type Plan } from "@/lib/permissions";

export const CLAIMS_TTL_MS = 5 * 60 * 1000;

type ClaimSource = { _id: { toString(): string }; email: string; role: string; plan?: string; image?: string };

type CachedClaims = { id: string; role: string; plan: Plan; image?: string; at: number };

const claimsCache = new Map<string, CachedClaims>();

async function loadClaims(email: string, force: boolean): Promise<CachedClaims | null> {
  const cached = claimsCache.get(email);
  if (!force && cached && Date.now() - cached.at < CLAIMS_TTL_MS) return cached;

  await dbConnect();
  const dbUser = (await User.findOne(
    { email },
    "email role plan image",
  ).lean()) as ClaimSource | null;

  if (!dbUser) return cached ?? null;

  const role = effectiveRole(dbUser.email, dbUser.role);
  const claims: CachedClaims = {
    id: dbUser._id.toString(),
    role,
    plan: effectivePlan(role, dbUser.plan),
    image: dbUser.image,
    at: Date.now(),
  };
  claimsCache.set(email, claims);
  return claims;
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

        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.password) return null;

        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) return null;

        const role = effectiveRole(user.email, user.role);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role,
          plan: effectivePlan(role, user.plan),
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
            claimsCache.delete(existing.email);
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
        token.claimsAt = Date.now();
      }

      const stale = !token.claimsAt || Date.now() - token.claimsAt > CLAIMS_TTL_MS;
      const refresh =
        trigger === "update" ||
        account?.provider === "google" ||
        token.plan === undefined ||
        stale;

      if (refresh && token.email) {
        const claims = await loadClaims(
          token.email,
          trigger === "update" || account?.provider === "google",
        );

        if (claims) {
          token.id = claims.id;
          token.role = claims.role;
          token.plan = claims.plan;
          token.picture = claims.image || undefined;
        }
        token.claimsAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "free";
        session.user.plan = (token.plan as Plan | undefined) ?? "free";
        session.user.image = token.picture ?? null;
      }
      return session;
    },
  },
};

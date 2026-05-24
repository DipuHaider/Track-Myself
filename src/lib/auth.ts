import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { SUPERADMIN_EMAILS } from "@/lib/permissions";

export function effectiveRole(email: string, dbRole: string): string {
  if (SUPERADMIN_EMAILS.includes(email as (typeof SUPERADMIN_EMAILS)[number])) return "superadmin";
  return dbRole ?? "free";
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

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: effectiveRole(user.email, user.role),
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
          if (dirty) await existing.save();
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (account?.provider === "google" && token.email) {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = effectiveRole(dbUser.email, dbUser.role);
          if (dbUser.image) token.picture = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "free";
      }
      return session;
    },
  },
};

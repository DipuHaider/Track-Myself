import { encode } from "next-auth/jwt";
import { EXTENSION_TOKEN_SECONDS, effectivePlan, effectiveRole } from "@/lib/auth";
import { isVerified } from "@/lib/verified";

type TokenUser = {
  _id: { toString(): string };
  email: string;
  name?: string | null;
  role: string;
  plan?: string;
  password?: string | null;
  emailVerifiedAt?: Date | null;
};

export async function mintExtensionToken(user: TokenUser) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const role = effectiveRole(user.email, user.role, isVerified(user));

  const token = await encode({
    token: {
      id:       user._id.toString(),
      role,
      plan:     effectivePlan(role, user.plan),
      email:    user.email,
      aud:      "extension",
      claimsAt: Date.now(),
      sessionStart: Date.now(),
    },
    secret,
    maxAge: EXTENSION_TOKEN_SECONDS,
  });

  return { token, name: user.name ?? "", email: user.email };
}

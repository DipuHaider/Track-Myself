import dbConnect from "@/lib/db";
import User from "@/models/User";
import EmailVerificationToken from "@/models/EmailVerificationToken";
import { createOpaqueToken, hashToken, siteBase } from "@/lib/tokens";
import { canMailUsers, sendVerificationMail, sendWelcomeMail } from "@/lib/mail";
import { invalidateClaims } from "@/lib/auth";

export const VERIFY_TTL_HOURS = 24;

export { isVerified, type VerifiableUser } from "@/lib/verified";

export function verifyUrl(token: string) {
  return `${siteBase()}/verify-email?token=${encodeURIComponent(token)}`;
}

export function verificationRequired(): boolean {
  return process.env.NODE_ENV === "production" || canMailUsers();
}

type TokenOwner = { _id: unknown; name?: string; email: string };

export async function issueVerification(user: TokenOwner, ip: string): Promise<{ ok: boolean; error?: string }> {
  await dbConnect();
  await EmailVerificationToken.updateMany({ userId: user._id, usedAt: null }, { usedAt: new Date() });

  const { token, tokenHash } = createOpaqueToken();
  await EmailVerificationToken.create({
    userId: user._id,
    email: user.email,
    tokenHash,
    expiresAt: new Date(Date.now() + VERIFY_TTL_HOURS * 3600_000),
    requestedIp: ip,
  });

  const mail = await sendVerificationMail(user.email, {
    name: user.name || "there",
    verifyUrl: verifyUrl(token),
    expiresHours: VERIFY_TTL_HOURS,
  });
  if (!mail.ok) {
    await EmailVerificationToken.updateOne({ tokenHash }, { usedAt: new Date() });
    return { ok: false, error: mail.error };
  }
  return { ok: true };
}

export type ConsumeResult =
  | { ok: true; email: string; alreadyVerified: boolean }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function consumeVerification(token: string): Promise<ConsumeResult> {
  await dbConnect();
  if (!token || token.length < 32) return { ok: false, reason: "invalid" };

  const row = (await EmailVerificationToken.findOne({ tokenHash: hashToken(token) }).lean()) as
    | { _id: unknown; userId: unknown; email: string; expiresAt: Date; usedAt: Date | null }
    | null;
  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (new Date(row.expiresAt).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const claimed = await EmailVerificationToken.findOneAndUpdate(
    { _id: row._id, usedAt: null },
    { usedAt: new Date() },
  );
  if (!claimed) return { ok: false, reason: "used" };

  const user = await User.findOneAndUpdate(
    { _id: row.userId, email: row.email },
    { $set: { emailVerifiedAt: new Date() } },
    { new: false },
  );
  if (!user) return { ok: false, reason: "invalid" };

  invalidateClaims(user.email);
  const alreadyVerified = Boolean(user.emailVerifiedAt);
  if (!alreadyVerified) {
    await sendWelcomeMail(user.email, { name: user.name || "there", portalUrl: `${siteBase()}/me` }).catch(() => {});
  }
  return { ok: true, email: user.email, alreadyVerified };
}

export async function checkVerificationToken(token: string): Promise<boolean> {
  await dbConnect();
  if (!token || token.length < 32) return false;
  const row = (await EmailVerificationToken.findOne({ tokenHash: hashToken(token) }, "expiresAt usedAt").lean()) as
    | { expiresAt: Date; usedAt: Date | null }
    | null;
  return Boolean(row && !row.usedAt && new Date(row.expiresAt).getTime() > Date.now());
}

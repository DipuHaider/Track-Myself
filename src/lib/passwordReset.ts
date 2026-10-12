import { createOpaqueToken, hashToken, siteBase } from "@/lib/tokens";

export const RESET_TTL_MINUTES = 30;

export const createResetToken = createOpaqueToken;
export const hashResetToken = hashToken;

export function resetUrl(token: string) {
  return `${siteBase()}/reset-password?token=${encodeURIComponent(token)}`;
}

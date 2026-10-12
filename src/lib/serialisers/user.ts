export const USER_ADMIN_SELECT =
  "name email role plan status pausedAt image googleId password emailVerifiedAt lastLoginAt aiKey.provider aiKey.status aiKey.ciphertext createdAt updatedAt";

export const USER_PROFILE_SELECT =
  "name email role plan status pausedAt bio image googleId password emailVerifiedAt lastLoginAt a11y toursSeen notifPrefs createdAt";

type Raw = Record<string, unknown> & {
  _id?: unknown;
  aiKey?: { provider?: string | null; status?: string; ciphertext?: string };
  notifPrefs?: Map<string, boolean> | Record<string, boolean>;
};

function prefs(v: Raw["notifPrefs"]): Record<string, boolean> {
  if (!v) return {};
  if (v instanceof Map) return Object.fromEntries(v);
  return { ...v };
}

/* The two shapes that ever leave the server. Neither carries the password
   hash, the encrypted key material, the Google subject id or the read-state
   arrays — an allow-list, so a new field on the model is private by default. */
export function adminUserRow(u: Raw) {
  return {
    _id: String(u._id),
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role ?? "free",
    plan: u.plan ?? "free",
    status: u.status === "paused" ? "paused" : "active",
    pausedAt: u.pausedAt ?? null,
    image: u.image ?? "",
    hasPassword: Boolean(u.password),
    googleLinked: Boolean(u.googleId),
    emailVerifiedAt: u.emailVerifiedAt ?? null,
    emailVerified: Boolean(u.emailVerifiedAt) || !u.password || u.emailVerifiedAt === undefined,
    lastLoginAt: u.lastLoginAt ?? null,
    aiKey: {
      configured: Boolean(u.aiKey?.provider && u.aiKey?.ciphertext),
      provider: u.aiKey?.provider ?? null,
      status: u.aiKey?.status ?? "ok",
    },
    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
  };
}

export function profileView(u: Raw) {
  return {
    _id: String(u._id),
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role ?? "free",
    plan: u.plan ?? "free",
    status: u.status === "paused" ? "paused" : "active",
    pausedAt: u.pausedAt ?? null,
    bio: u.bio ?? "",
    image: u.image ?? "",
    hasPassword: Boolean(u.password),
    googleLinked: Boolean(u.googleId),
    emailVerified: Boolean(u.emailVerifiedAt) || !u.password || u.emailVerifiedAt === undefined,
    emailVerifiedAt: u.emailVerifiedAt ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
    a11y: u.a11y ?? {},
    toursSeen: Array.isArray(u.toursSeen) ? u.toursSeen : [],
    notifPrefs: prefs(u.notifPrefs),
    createdAt: u.createdAt ?? null,
  };
}

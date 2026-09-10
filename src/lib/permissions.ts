export const SUPERADMIN_EMAILS = ["dipuhaider@gmail.com", "fuadhaiderdipu@gmail.com"] as const;

export const ROLES = ["superadmin", "admin", "editor", "paid", "free"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  paid: "Paid",
  free: "Free",
};

export const ACCOUNT_STATUSES = ["active", "paused"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PLANS = ["free", "premium"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  premium: "Premium",
};

export const BACKEND_ROLES: readonly Role[] = ["superadmin", "admin", "editor"];

export function isBackendRole(role?: string | null): boolean {
  return BACKEND_ROLES.includes(role as Role);
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === "superadmin";
}

export function isAdmin(role?: string | null): boolean {
  return role === "superadmin" || role === "admin";
}

export function isEditor(role?: string | null): boolean {
  return role === "superadmin" || role === "admin" || role === "editor";
}

export function isPaid(role?: string | null): boolean {
  return role === "paid" || isAdmin(role);
}

/* ── Dashboard action → minimum roles allowed ── */
export type DashboardAction =
  | "view:analytics"
  | "view:users"
  | "view:applications"
  | "edit:applications"
  | "delete:applications"
  | "view:cv"
  | "view:settings"
  | "edit:users"
  | "delete:users"
  | "assign:superadmin";

export const ACTION_ROLES: Record<DashboardAction, readonly Role[]> = {
  "view:analytics":    ["superadmin", "admin", "editor"],
  "view:users":        ["superadmin", "admin", "editor"],
  "view:applications":   ["superadmin", "admin", "editor"],
  "edit:applications":   ["superadmin", "admin"],
  "delete:applications": ["superadmin", "admin"],
  "view:cv":             ["superadmin", "admin", "editor"],
  "view:settings":     ["superadmin", "admin"],
  "edit:users":        ["superadmin", "admin"],
  "delete:users":      ["superadmin", "admin"],
  "assign:superadmin": ["superadmin"],
};

export const ACTION_LABELS: Record<DashboardAction, string> = {
  "view:analytics":    "View analytics",
  "view:users":        "View users",
  "view:applications": "View all applications",
  "edit:applications": "Edit any application",
  "delete:applications": "Delete any application",
  "view:cv":           "View CV overview",
  "view:settings":     "View settings",
  "edit:users":        "Edit users",
  "delete:users":      "Delete users",
  "assign:superadmin": "Assign the superadmin role",
};

export const ACTION_DESCRIPTIONS: Record<DashboardAction, string> = {
  "view:analytics":    "Open the Analytics page and read cross-user application metrics.",
  "view:users":        "Open the Users page and list every account.",
  "view:applications": "Open All Applications and read every user's applications.",
  "edit:applications": "Change status, priority or details on another user's application.",
  "delete:applications": "Permanently delete another user's application.",
  "view:cv":           "Open the CV Overview page and see CV adoption per user.",
  "view:settings":     "Open Settings, including configuration and data counts.",
  "edit:users":        "Change another account's role or plan.",
  "delete:users":      "Permanently delete an account.",
  "assign:superadmin": "Grant or modify the superadmin role. Superadmin only.",
};

export const DASHBOARD_ACTIONS = Object.keys(ACTION_ROLES) as DashboardAction[];

export const LOCKED_ACTIONS: readonly DashboardAction[] = ["assign:superadmin"];

export function canDo(role: string | null | undefined, action: DashboardAction): boolean {
  if (!role) return false;
  return (ACTION_ROLES[action] as readonly string[]).includes(role);
}

export function canUseLebenslauf(role?: string | null, email?: string | null): boolean {
  if (isSuperAdmin(role)) return true;
  return SUPERADMIN_EMAILS.includes(email as (typeof SUPERADMIN_EMAILS)[number]);
}

/* ── CV entitlements ──────────────────────────────────────────────────────
   One matrix, used by the builder UI, the generate endpoint and the per-application
   Docs menu, so a format can never be offered that the server will refuse.

   free        ATS Compact and Designer, .docx only
   premium     every format except Lebenslauf, .docx and .pdf
   superadmin  everything, no restrictions
   ---------------------------------------------------------------------- */

export type CVFormatKey = `${string}:${string}`;

export const CV_FORMATS_FREE: CVFormatKey[] = ["ats:compact", "designer:full"];

export const CV_FORMATS_PREMIUM: CVFormatKey[] = [
  "ats:full", "ats:compact", "europass:full", "designer:full",
];

export const CV_FORMATS_ALL: CVFormatKey[] = [
  "ats:full", "ats:compact", "europass:full", "designer:full", "lebenslauf:full",
];

export function cvFormatsFor(role?: string | null, plan?: string | null): CVFormatKey[] {
  if (isSuperAdmin(role)) return CV_FORMATS_ALL;
  if (isPremiumUser(role, plan)) return CV_FORMATS_PREMIUM;
  return CV_FORMATS_FREE;
}

export function canUseCVFormat(
  role: string | null | undefined,
  plan: string | null | undefined,
  format: string,
  variant: string,
): boolean {
  return cvFormatsFor(role, plan).includes(`${format}:${variant}` as CVFormatKey);
}

/** Only premium and above may export PDF; everyone else gets .docx. */
export function canExportPdf(role?: string | null, plan?: string | null): boolean {
  return isSuperAdmin(role) || isPremiumUser(role, plan);
}

/** The per-application Docs menu is hidden from free accounts and logged-out visitors. */
export function canUseAppDocs(role?: string | null, plan?: string | null): boolean {
  return isSuperAdmin(role) || isPremiumUser(role, plan);
}

/** How many stored CV versions an account may keep. */
export function cvVersionLimit(role?: string | null, plan?: string | null): number {
  if (isSuperAdmin(role)) return Infinity;
  return isPremiumUser(role, plan) ? 5 : 1;
}

export type RoleTier = "superadmin" | "admin" | "editor" | "premium" | "free";

export const TIER_LABELS: Record<RoleTier, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  premium: "Premium",
  free: "Free",
};

export function roleTier(role?: string | null, plan?: string | null): RoleTier {
  if (role === "superadmin") return "superadmin";
  if (role === "admin") return "admin";
  if (role === "editor") return "editor";
  if (isPremiumUser(role, plan)) return "premium";
  return "free";
}

export const ALWAYS_PREMIUM_ROLES: readonly Role[] = ["superadmin", "paid"];

export function isPremiumRole(role?: string | null): boolean {
  return ALWAYS_PREMIUM_ROLES.includes(role as Role);
}

export function isPremiumUser(role?: string | null, plan?: string | null): boolean {
  return isPremiumRole(role) || plan === "premium";
}

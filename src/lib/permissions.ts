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

export const ALWAYS_PREMIUM_ROLES: readonly Role[] = ["superadmin", "paid"];

export function isPremiumRole(role?: string | null): boolean {
  return ALWAYS_PREMIUM_ROLES.includes(role as Role);
}

export function isPremiumUser(role?: string | null, plan?: string | null): boolean {
  return isPremiumRole(role) || plan === "premium";
}

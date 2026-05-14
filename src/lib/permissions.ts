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
  | "view:settings"
  | "edit:users"
  | "delete:users"
  | "assign:superadmin";

export const ACTION_ROLES: Record<DashboardAction, readonly Role[]> = {
  "view:analytics":    ["superadmin", "admin", "editor"],
  "view:users":        ["superadmin", "admin", "editor"],
  "view:applications": ["superadmin", "admin", "editor"],
  "view:settings":     ["superadmin", "admin"],
  "edit:users":        ["superadmin", "admin"],
  "delete:users":      ["superadmin", "admin"],
  "assign:superadmin": ["superadmin"],
};

export function canDo(role: string | null | undefined, action: DashboardAction): boolean {
  if (!role) return false;
  return (ACTION_ROLES[action] as readonly string[]).includes(role);
}

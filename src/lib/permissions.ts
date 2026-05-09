export const ROLES = ["admin", "editor", "premium", "general"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  premium: "Premium",
  general: "General",
};

export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}

export function isEditor(role?: string | null): boolean {
  return role === "editor" || role === "admin";
}

export function isPremium(role?: string | null): boolean {
  return role === "premium" || role === "admin";
}

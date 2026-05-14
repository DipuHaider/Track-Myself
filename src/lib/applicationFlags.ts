import type { Application } from "@/types/application";

const GHOST_STATUSES = new Set(["Submitted", "No Response", "Wishlist"]);
const GHOST_DAYS = 45;

export function isPossibleGhost(app: Application): boolean {
  if (!app.appliedDate) return false;
  const days = (Date.now() - new Date(app.appliedDate).getTime()) / 86_400_000;
  return days > GHOST_DAYS && GHOST_STATUSES.has(app.applicationStatus);
}

export function computeDuplicateIds(applications: Application[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const app of applications) {
    const key = `${app.companyName.toLowerCase().trim()}|${app.jobTitle.toLowerCase().trim()}`;
    const arr = groups.get(key) ?? [];
    arr.push(app._id);
    groups.set(key, arr);
  }
  const ids = new Set<string>();
  for (const group of groups.values()) {
    if (group.length > 1) group.forEach((id) => ids.add(id));
  }
  return ids;
}

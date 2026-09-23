import type { Application } from "@/types/application";

const GHOST_STATUSES = new Set(["Submitted", "No Response", "Wishlist"]);
const GHOST_DAYS = 45;

/* Wishlist rows carry no appliedDate — the user has not applied yet — so they
   fall back to when the row was created. Without that, "Wishlist" sat in
   GHOST_STATUSES and could never match. */
export function isPossibleGhost(app: Application): boolean {
  const since = app.appliedDate ?? app.createdAt;
  if (!since) return false;
  const started = new Date(since).getTime();
  if (Number.isNaN(started)) return false;
  const days = (Date.now() - started) / 86_400_000;
  return days > GHOST_DAYS && GHOST_STATUSES.has(app.applicationStatus);
}

export function computeDuplicateIds(applications: Application[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const app of applications) {
    const company = (app.companyName ?? "").toLowerCase().trim();
    const title = (app.jobTitle ?? "").toLowerCase().trim();
    if (!company && !title) continue;
    const key = `${company}|${title}`;
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

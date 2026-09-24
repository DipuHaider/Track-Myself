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

/* Posting age is a different question from the ghost rule above, and conflating
   them would be wrong in both directions. isPossibleGhost asks how long YOU have
   waited without a reply; this asks how long the LISTING has been up. A posting
   from last week can sit unanswered for months, and a year-old posting can be
   filled the day you apply.

   It reports what was observed and nothing more. There is no probability here,
   and no claim that an old posting is fake — that would need outcomes to
   validate against, which nothing in this app has. */
export type PostingAge = {
  known: boolean;
  days: number | null;
  label: string;
  tone: "neutral" | "caution";
  approximate: boolean;
};

const OLD_DAYS = 30;
const VERY_OLD_DAYS = 90;

export function postingAge(app: Application): PostingAge {
  const unknown: PostingAge = {
    known: false,
    days: null,
    label: "Posting age unknown",
    tone: "neutral",
    approximate: false,
  };

  if (!app.postedAt) return unknown;

  const at = new Date(app.postedAt).getTime();
  if (Number.isNaN(at)) return unknown;

  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days < 0) return unknown;

  const approximate = app.postingPrecision !== "exact";
  const about = approximate ? "about " : "";

  if (days >= VERY_OLD_DAYS) {
    return {
      known: true, days, approximate, tone: "caution",
      label: `Posted ${about}${Math.round(days / 30)} months ago — current availability unconfirmed`,
    };
  }

  if (days >= OLD_DAYS) {
    return {
      known: true, days, approximate, tone: "caution",
      label: `Posted ${about}${Math.round(days / 7)} weeks ago — older posting`,
    };
  }

  return {
    known: true, days, approximate, tone: "neutral",
    label: days <= 1 ? "Posted in the last day" : `Posted ${about}${days} days ago`,
  };
}

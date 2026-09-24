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

/* Legal form is not identity: "Blotato" and "Blotato GmbH" are one employer.
   Stripped only from the end, so a company actually called "Limited Books" keeps
   its name. */
const COMPANY_SUFFIX =
  /[\s,.]+(gmbh|ag|ug|kg|ohg|mbh|ltd|limited|llc|l\.l\.c|inc|incorporated|corp|corporation|co|plc|bv|b\.v|nv|sa|s\.a|srl|s\.r\.l|oy|ab|as|aps|pty|pte|sdn|bhd|group|holding|holdings)\.?$/i;

export function normaliseCompany(raw: string): string {
  let out = (raw ?? "").toLowerCase().replace(/[^a-z0-9&\s.,-]/g, " ").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const next = out.replace(COMPANY_SUFFIX, "").trim();
    if (next === out) break;
    out = next;
  }
  return out.replace(/[.,\-\s]+$/, "").trim();
}

/* Punctuation and spacing only. Seniority and bracketed qualifiers are left
   alone on purpose — "Senior Engineer" is not "Engineer", and "Engineer
   (Backend)" is not "Engineer (Frontend)". Collapsing those would merge roles
   the user genuinely applied to separately. */
export function normaliseTitle(raw: string): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9+#()\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* The posting's own id, where the URL carries one. Two rows pointing at the
   same LinkedIn or Indeed posting are the same job regardless of how the
   company name was typed, which makes this the strongest signal available. */
export function postingIdentity(app: Application): string | null {
  const url = (app.jobPostUrl ?? "").trim();
  if (!url) return null;

  const linkedin = url.match(/linkedin\.com\/jobs\/view\/(\d+)/i)?.[1]
    ?? url.match(/[?&]currentJobId=(\d+)/i)?.[1];
  if (linkedin) return `linkedin:${linkedin}`;

  const indeed = url.match(/[?&](?:jk|vjk)=([a-z0-9]+)/i)?.[1];
  if (indeed) return `indeed:${indeed}`;

  return null;
}

export type DuplicateKind = "same-posting" | "same-role";

/* Candidates for the user to look at, never a merge. Two openings with one
   title at one company are a real thing, as are subsidiaries sharing a name, so
   nothing here may delete, combine or rewrite a record on its own. */
export function computeDuplicateGroups(applications: Application[]): Map<string, DuplicateKind> {
  const byPosting = new Map<string, string[]>();
  const byRole = new Map<string, string[]>();

  for (const app of applications) {
    const posting = postingIdentity(app);
    if (posting) {
      byPosting.set(posting, [...(byPosting.get(posting) ?? []), app._id]);
    }

    const company = normaliseCompany(app.companyName ?? "");
    const title = normaliseTitle(app.jobTitle ?? "");
    if (!company && !title) continue;
    const key = `${company}|${title}`;
    byRole.set(key, [...(byRole.get(key) ?? []), app._id]);
  }

  const out = new Map<string, DuplicateKind>();
  for (const group of byRole.values()) {
    if (group.length > 1) group.forEach((id) => out.set(id, "same-role"));
  }
  /* Set second so the stronger signal wins where both apply. */
  for (const group of byPosting.values()) {
    if (group.length > 1) group.forEach((id) => out.set(id, "same-posting"));
  }
  return out;
}

export function computeDuplicateIds(applications: Application[]): Set<string> {
  return new Set(computeDuplicateGroups(applications).keys());
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

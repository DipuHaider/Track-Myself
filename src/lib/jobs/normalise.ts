import { normaliseCompany, normaliseTitle, postingIdentity } from "@/lib/applicationFlags";
import { splitLocation } from "@/lib/applicationLocation";
import type { Application } from "@/types/application";
import type { LeadDraft, RawLead } from "@/lib/jobs/types";

const DESCRIPTION_MAX = 24_000;

/* The platform a lead counts toward is where the owner would actually apply,
   not where we heard about it: a Bundesagentur hit whose apply link is on
   stepstone.de is a StepStone application. */
export function platformFromUrl(raw: string | null | undefined): string {
  let host = "";
  try {
    host = new URL(raw ?? "").hostname.toLowerCase();
  } catch {
    return "Other";
  }
  if (/(^|\.)linkedin\.com$/.test(host)) return "LinkedIn";
  if (/(^|\.)xing\.com$/.test(host)) return "Xing";
  if (/(^|\.)stepstone\.(de|at|com)$/.test(host)) return "StepStone";
  if (/(^|\.)indeed\.[a-z.]+$/.test(host)) return "Indeed";
  if (/(^|\.)glassdoor\.[a-z.]+$/.test(host)) return "Glassdoor";
  if (/(^|\.)(arbeitsagentur\.de|adzuna\.[a-z.]+)$/.test(host)) return "Other";
  return "Company Website";
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
};

export function htmlToText(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 300);
}

export function matchKeyFor(company: string, title: string): string {
  const c = normaliseCompany(company);
  const t = normaliseTitle(title);
  return c && t ? `${c}|${t}` : "";
}

export function identityFor(urls: (string | undefined | null)[], fallback: string): string {
  for (const url of urls) {
    const id = url ? postingIdentity({ jobPostUrl: url } as Application) : null;
    if (id) return id;
  }
  return fallback;
}

function validDate(d: Date | null | undefined, now: Date): Date | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  if (d.getTime() > now.getTime() + 86_400_000) return null;
  if (d.getFullYear() < 2000) return null;
  return d;
}

function validDeadline(d: Date | null | undefined): Date | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.getFullYear() < 2000 ? null : d;
}

function safeHttp(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 2048) : "";
  } catch {
    return "";
  }
}

export function toLeadDraft(raw: RawLead, now = new Date()): LeadDraft | null {
  const title = cleanTitle(raw.title ?? "");
  const company = (raw.company ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const url = safeHttp(raw.url);
  if (!title || !company || !url || !raw.externalId) return null;

  const applyUrl = safeHttp(raw.applyUrl) || url;
  const where = splitLocation(raw.location ?? "");
  const description = htmlToText(raw.description).slice(0, DESCRIPTION_MAX);

  return {
    source: raw.source,
    externalId: String(raw.externalId).slice(0, 300),
    title,
    company,
    location: where.label || (raw.location ?? "").trim().slice(0, 200),
    city: where.city,
    country: where.country,
    url,
    applyUrl,
    postedAt: validDate(raw.postedAt ?? null, now),
    postedAgeText: (raw.postedAgeText ?? "").slice(0, 60),
    deadline: validDeadline(raw.deadline ?? null),
    description,
    salary: (raw.salary ?? "").slice(0, 200),
    remote: raw.remote === true,
    platform: leadPlatform(url, applyUrl),
    identity: identityFor([url, applyUrl], `${raw.source}:${raw.externalId}`),
    matchKey: matchKeyFor(company, title),
  };
}

const BOARDS = new Set(["LinkedIn", "Xing", "StepStone", "Indeed", "Glassdoor"]);

export function leadPlatform(url: string, applyUrl: string): string {
  const apply = platformFromUrl(applyUrl);
  if (BOARDS.has(apply)) return apply;
  const seen = platformFromUrl(url);
  if (BOARDS.has(seen)) return seen;
  return apply;
}

export function withinAge(postedAt: Date | null, maxAgeDays: number, now = new Date()): boolean {
  if (!postedAt) return true;
  return now.getTime() - postedAt.getTime() <= (maxAgeDays + 0.5) * 86_400_000;
}

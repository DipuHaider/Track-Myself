import type { RawLead, SearchQuery, SourceResult } from "@/lib/jobs/types";

/* Bundesagentur für Arbeit Jobsuche. The key is the public client id the
   agency's own web app uses; BA_API_KEY overrides it if that ever changes.
   Search moved to v6 in 2026 while job details still answer on v4, so the
   two calls deliberately use different versions. */
const BASE = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const SEARCH_PATH = "/pc/v6/jobs";
const DETAIL_PATH = "/pc/v4/jobdetails/";
const PAGE_SIZE = 50;
const TIMEOUT_MS = 10_000;

function apiKey(): string {
  return (process.env.BA_API_KEY ?? "").trim() || "jobboerse-jobsuche";
}

type BaAddress = { ort?: string; region?: string; land?: string; plz?: string };
type BaItem = {
  referenznummer?: string;
  stellenangebotsTitel?: string;
  titel?: string;
  beruf?: string;
  firma?: string;
  arbeitgeber?: string;
  externeURL?: string;
  stellenlokationen?: { adresse?: BaAddress }[];
  arbeitsort?: BaAddress;
  veroeffentlichungszeitraum?: { von?: string; bis?: string };
  aktuelleVeroeffentlichungsdatum?: string;
  datumErsteVeroeffentlichung?: string;
  homeofficemoeglich?: boolean;
  stellenangebotsBeschreibung?: string;
  verguetung?: string;
};

function date(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw.length === 10 ? `${raw}T08:00:00` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function place(item: BaItem): string {
  const a = item.stellenlokationen?.[0]?.adresse ?? item.arbeitsort;
  if (!a) return "";
  const country = a.land && a.land !== "DEUTSCHLAND" ? a.land : "Germany";
  return [a.ort, country].filter(Boolean).join(", ");
}

export function detailUrl(ref: string): string {
  return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(ref)}`;
}

export function parseBaList(json: unknown): RawLead[] {
  const list = ((json as { ergebnisliste?: BaItem[]; stellenangebote?: BaItem[] })?.ergebnisliste
    ?? (json as { stellenangebote?: BaItem[] })?.stellenangebote
    ?? []) as BaItem[];
  const out: RawLead[] = [];
  for (const item of list) {
    const ref = item.referenznummer;
    const title = item.stellenangebotsTitel ?? item.titel ?? item.beruf;
    const company = item.firma ?? item.arbeitgeber;
    if (!ref || !title || !company) continue;
    out.push({
      source: "ba",
      externalId: ref,
      title,
      company,
      location: place(item),
      url: detailUrl(ref),
      applyUrl: item.externeURL || undefined,
      postedAt: date(item.veroeffentlichungszeitraum?.von ?? item.aktuelleVeroeffentlichungsdatum),
      deadline: date(item.veroeffentlichungszeitraum?.bis),
      remote: item.homeofficemoeglich === true,
    });
  }
  return out;
}

export function parseBaDetail(json: unknown): Pick<RawLead, "description" | "applyUrl" | "deadline" | "salary"> {
  const d = (json ?? {}) as BaItem;
  return {
    description: d.stellenangebotsBeschreibung ?? "",
    applyUrl: d.externeURL || undefined,
    deadline: date(d.veroeffentlichungszeitraum?.bis),
    salary: d.verguetung ?? "",
  };
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey(), Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "manual",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Bundesagentur answered ${res.status}`);
  return res.json();
}

export async function searchBa(q: SearchQuery, pages = 1): Promise<SourceResult> {
  const leads: RawLead[] = [];
  const errors: string[] = [];
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      was: q.keywords,
      veroeffentlichtseit: String(q.maxAgeDays),
      size: String(PAGE_SIZE),
      page: String(page),
      angebotsart: "1",
    });
    if (q.location) {
      params.set("wo", q.location);
      params.set("umkreis", String(q.radiusKm || 25));
    }
    try {
      const batch = parseBaList(await getJson(`${BASE}${SEARCH_PATH}?${params}`));
      leads.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Bundesagentur search failed");
      break;
    }
  }
  return { leads, errors };
}

export async function baDetail(ref: string): Promise<ReturnType<typeof parseBaDetail> | null> {
  try {
    const encoded = Buffer.from(ref, "utf8").toString("base64");
    return parseBaDetail(await getJson(`${BASE}${DETAIL_PATH}${encoded}`));
  } catch {
    return null;
  }
}

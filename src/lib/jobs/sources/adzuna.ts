import type { RawLead, SearchQuery, SourceResult } from "@/lib/jobs/types";

const BASE = "https://api.adzuna.com/v1/api/jobs/de/search";
const PAGE_SIZE = 50;
const TIMEOUT_MS = 10_000;

type AdzunaItem = {
  id?: string | number;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string | number;
};

export function adzunaConfigured(): boolean {
  return Boolean(process.env.ADZUNA_APP_ID?.trim() && process.env.ADZUNA_APP_KEY?.trim());
}

function salary(item: AdzunaItem): string {
  if (String(item.salary_is_predicted) === "1") return "";
  const fmt = (n: number) => `€${Math.round(n).toLocaleString("de-DE")}`;
  if (item.salary_min && item.salary_max && item.salary_min !== item.salary_max) {
    return `${fmt(item.salary_min)} – ${fmt(item.salary_max)} / year`;
  }
  const one = item.salary_min ?? item.salary_max;
  return one ? `${fmt(one)} / year` : "";
}

export function parseAdzuna(json: unknown): RawLead[] {
  const results = ((json as { results?: AdzunaItem[] })?.results ?? []) as AdzunaItem[];
  const out: RawLead[] = [];
  for (const item of results) {
    const id = item.id != null ? String(item.id) : "";
    const title = (item.title ?? "").replace(/<[^>]+>/g, "");
    const company = item.company?.display_name ?? "";
    if (!id || !title || !company || !item.redirect_url) continue;
    const created = item.created ? new Date(item.created) : null;
    out.push({
      source: "adzuna",
      externalId: id,
      title,
      company,
      location: item.location?.display_name ?? "",
      url: item.redirect_url,
      postedAt: created && !Number.isNaN(created.getTime()) ? created : null,
      description: item.description ?? "",
      salary: salary(item),
    });
  }
  return out;
}

export async function searchAdzuna(q: SearchQuery): Promise<SourceResult> {
  if (!adzunaConfigured()) return { leads: [], errors: [] };
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!.trim(),
    app_key: process.env.ADZUNA_APP_KEY!.trim(),
    what: q.keywords,
    max_days_old: String(q.maxAgeDays),
    results_per_page: String(PAGE_SIZE),
    sort_by: "date",
    "content-type": "application/json",
  });
  if (q.location) {
    params.set("where", q.location);
    params.set("distance", String(q.radiusKm || 25));
  }
  try {
    const res = await fetch(`${BASE}/1?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
      cache: "no-store",
    });
    if (!res.ok) return { leads: [], errors: [`Adzuna answered ${res.status}`] };
    return { leads: parseAdzuna(await res.json()), errors: [] };
  } catch (err) {
    return { leads: [], errors: [err instanceof Error ? err.message : "Adzuna search failed"] };
  }
}

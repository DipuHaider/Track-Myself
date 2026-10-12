import { APPLICATION_STATUSES, JOB_TYPES } from "@/constants/applicationStatus";

export const APPLICATION_FLAGS = ["ghost-manual", "ghost-auto", "duplicate", "warm", "favourite"] as const;
export type ApplicationFlag = (typeof APPLICATION_FLAGS)[number];

export const APPLICATION_SORTS = ["createdAt", "appliedDate", "updatedAt", "companyName"] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

export const SORT_LABELS: Record<ApplicationSort, string> = {
  createdAt: "Newest first",
  appliedDate: "Applied date",
  updatedAt: "Recently updated",
  companyName: "Company A–Z",
};

export const FLAG_LABELS: Record<ApplicationFlag, string> = {
  "ghost-auto": "Possible ghost (45+ days)",
  "ghost-manual": "Confirmed ghost",
  duplicate: "Duplicates",
  warm: "Warm leads",
  favourite: "Favourites",
};

export const PRIORITIES = ["High", "Medium", "Low"] as const;

export type ApplicationFilters = {
  q: string;
  status: string;
  priority: string;
  type: string;
  flag: ApplicationFlag | "";
  sort: ApplicationSort;
  page: number;
  open: string;
  tab: string;
};

export const DEFAULT_FILTERS: ApplicationFilters = {
  q: "",
  status: "",
  priority: "",
  type: "",
  flag: "",
  sort: "createdAt",
  page: 1,
  open: "",
  tab: "",
};

const STATUSES: readonly string[] = APPLICATION_STATUSES;
const TYPES: readonly string[] = JOB_TYPES;
const PRIORITY_SET: readonly string[] = PRIORITIES;
const FLAGS: readonly string[] = APPLICATION_FLAGS;
const SORTS: readonly string[] = APPLICATION_SORTS;
const TABS: readonly string[] = ["interviews"];
const OBJECT_ID = /^[a-f0-9]{24}$/i;

function pick(value: string | null, allowed: readonly string[]): string {
  return value && allowed.includes(value) ? value : "";
}

export function parseFilters(params: URLSearchParams): ApplicationFilters {
  const page = Math.floor(Number(params.get("page")));
  const open = (params.get("open") ?? "").trim();
  return {
    q: (params.get("q") ?? "").trim().slice(0, 120),
    status: pick(params.get("status"), STATUSES),
    priority: pick(params.get("priority"), PRIORITY_SET),
    type: pick(params.get("type"), TYPES),
    flag: pick(params.get("flag"), FLAGS) as ApplicationFlag | "",
    sort: (pick(params.get("sort"), SORTS) || DEFAULT_FILTERS.sort) as ApplicationSort,
    page: Number.isFinite(page) && page > 1 ? page : 1,
    open: OBJECT_ID.test(open) ? open : "",
    tab: pick(params.get("tab"), TABS),
  };
}

export function toSearchParams(filters: ApplicationFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (filters.q) out.set("q", filters.q);
  if (filters.status) out.set("status", filters.status);
  if (filters.priority) out.set("priority", filters.priority);
  if (filters.type) out.set("type", filters.type);
  if (filters.flag) out.set("flag", filters.flag);
  if (filters.sort && filters.sort !== DEFAULT_FILTERS.sort) out.set("sort", filters.sort);
  if (filters.page > 1) out.set("page", String(filters.page));
  if (filters.open) out.set("open", filters.open);
  if (filters.tab) out.set("tab", filters.tab);
  return out;
}

export const APPLICATIONS_ENDPOINT = "/api/applications";

/* `favourite` is exposed to the UI as a flag but the API takes it as its own
   parameter; everything else maps one to one. */
export function toApiQuery(filters: ApplicationFilters, limit: number): string {
  const out = new URLSearchParams();
  out.set("page", String(filters.page));
  out.set("limit", String(limit));
  if (filters.q) out.set("q", filters.q);
  if (filters.status) out.set("status", filters.status);
  if (filters.priority) out.set("priority", filters.priority);
  if (filters.type) out.set("type", filters.type);
  if (filters.flag === "favourite") out.set("favourite", "1");
  else if (filters.flag) out.set("flag", filters.flag);
  if (filters.sort !== DEFAULT_FILTERS.sort) out.set("sort", filters.sort);
  return `${APPLICATIONS_ENDPOINT}?${out.toString()}`;
}

export function countActiveFilters(filters: ApplicationFilters): number {
  return ["status", "priority", "type", "flag"].filter((k) => Boolean(filters[k as keyof ApplicationFilters])).length;
}

export function hasAnyFilter(filters: ApplicationFilters): boolean {
  return Boolean(filters.q) || countActiveFilters(filters) > 0;
}

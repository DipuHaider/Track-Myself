import type { Application } from "@/types/application";

export const SALARY_TYPES = ["fixed", "range", "negotiable", "not-mentioned"] as const;

export type SalaryType = (typeof SALARY_TYPES)[number];

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  fixed: "Fixed",
  range: "Range",
  negotiable: "Negotiable",
  "not-mentioned": "Not mentioned",
};

export function hasSalaryAmount(type?: string | null): boolean {
  return type !== "negotiable" && type !== "not-mentioned";
}

export function compactAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const trim = (v: number) => String(Math.round(v * 100) / 100);
  if (Math.abs(n) >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (Math.abs(n) >= 1_000) return `${trim(n / 1_000)}K`;
  return String(n);
}

const CURRENCY_SYM: Record<string, string> = { EUR: "€", USD: "$", BDT: "৳" };

export function formatSalary(app: Partial<Application>): string {
  if (app.salaryType === "negotiable") return SALARY_TYPE_LABELS.negotiable;
  if (app.salaryType === "not-mentioned") return SALARY_TYPE_LABELS["not-mentioned"];
  const sym = CURRENCY_SYM[app.salaryCurrency ?? ""] ?? "";
  if (app.salaryType === "range") {
    const { salaryMin: min, salaryMax: max } = app;
    if (min != null && max != null) return `${sym}${compactAmount(min)} – ${sym}${compactAmount(max)}`;
    if (min != null) return `from ${sym}${compactAmount(min)}`;
    if (max != null) return `up to ${sym}${compactAmount(max)}`;
    return app.salary ?? "";
  }
  if (app.salaryFixed != null) return `${sym}${compactAmount(app.salaryFixed)}`;
  return app.salary ?? "";
}

export function parseAmount(raw: string): number | null {
  let t = raw.trim().toLowerCase().replace(/^[€$৳£]\s*/, "").replace(/[\s_]/g, "");
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+([km])?$/.test(t)) t = t.replace(/\./g, "");
  else if (/^\d+,\d{1,2}([km])?$/.test(t)) t = t.replace(",", ".");
  t = t.replace(/,/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return NaN;
  const scale = m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1;
  return Math.round(Number(m[1]) * scale);
}

export function editableAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  const short = compactAmount(n);
  return parseAmount(short) === n ? short : String(n);
}

export function isValidRange(min: string, max: string): boolean {
  const lo = parseAmount(min);
  const hi = parseAmount(max);
  return lo == null || hi == null || Number.isNaN(lo) || Number.isNaN(hi) || lo <= hi;
}

export function isValidAmount(raw: string): boolean {
  return !Number.isNaN(parseAmount(raw));
}

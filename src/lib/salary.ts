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

const CURRENCY_SYM: Record<string, string> = { EUR: "€", USD: "$", BDT: "৳" };

export function formatSalary(app: Partial<Application>): string {
  if (app.salaryType === "negotiable") return SALARY_TYPE_LABELS.negotiable;
  if (app.salaryType === "not-mentioned") return SALARY_TYPE_LABELS["not-mentioned"];
  const sym = CURRENCY_SYM[app.salaryCurrency ?? ""] ?? "";
  if (app.salaryType === "range" && app.salaryMin != null && app.salaryMax != null) {
    return `${sym}${app.salaryMin.toLocaleString("en-US")} – ${sym}${app.salaryMax.toLocaleString("en-US")}`;
  }
  if (app.salaryFixed != null) return `${sym}${app.salaryFixed.toLocaleString("en-US")}`;
  return app.salary ?? "";
}

export function parseAmount(raw: string): number | null {
  let t = raw.trim().toLowerCase().replace(/^[€$৳£]\s*/, "").replace(/[\s_]/g, "");
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  t = t.replace(/,/g, "");
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return NaN;
  const scale = m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1;
  return Math.round(Number(m[1]) * scale);
}

export function isValidAmount(raw: string): boolean {
  return !Number.isNaN(parseAmount(raw));
}

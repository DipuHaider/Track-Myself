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

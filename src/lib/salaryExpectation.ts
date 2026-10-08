import { compactAmount } from "@/lib/salary";

export const EXPECTATION_MODES = ["amount", "range", "negotiable", "ask-budget"] as const;
export type ExpectationMode = (typeof EXPECTATION_MODES)[number];

export const EXPECTATION_MODE_LABELS: Record<ExpectationMode, string> = {
  amount: "Amount",
  range: "Range",
  negotiable: "Negotiable",
  "ask-budget": "Ask their budget",
};

export const SALARY_PERIODS = ["year", "month"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const DEFAULT_RAISE_PCT = 10;

const SYMBOL: Record<string, string> = { EUR: "€", USD: "$", BDT: "৳" };

export type PostedSalary = {
  salaryType?: string | null;
  salaryFixed?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

export type CalculatorInputs = {
  current?: number | null;
  minimum?: number | null;
  raisePct?: number | null;
  inputPeriod: SalaryPeriod;
  posted?: PostedSalary;
  estimate?: { low: number; high: number } | null;
};

export type CalculatorResult = {
  annual: number | null;
  rangeHigh: number | null;
  basis: string;
  warnings: string[];
};

export type ExpectationAnswer = { key: string; label: string; text: string; mode: ExpectationMode; period: SalaryPeriod };

export function toAnnual(value: number, period: SalaryPeriod): number {
  return period === "month" ? value * 12 : value;
}

export function fromAnnual(value: number, period: SalaryPeriod): number {
  return period === "month" ? value / 12 : value;
}

export function roundFor(value: number, period: SalaryPeriod): number {
  const step = period === "month" ? 100 : 1000;
  return Math.round(value / step) * step;
}

function positive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function calculateExpectation(inputs: CalculatorInputs): CalculatorResult {
  const warnings: string[] = [];
  const raise = Math.min(100, Math.max(0, inputs.raisePct ?? DEFAULT_RAISE_PCT)) / 100;
  const current = positive(inputs.current) ? toAnnual(inputs.current, inputs.inputPeriod) : null;
  const minimum = positive(inputs.minimum) ? toAnnual(inputs.minimum, inputs.inputPeriod) : null;

  const p = inputs.posted ?? {};
  let postedAnchor: number | null = null;
  let postedTop: number | null = null;
  if (p.salaryType === "range" && positive(p.salaryMin) && positive(p.salaryMax)) {
    postedAnchor = p.salaryMin + 0.75 * (p.salaryMax - p.salaryMin);
    postedTop = p.salaryMax;
  } else if (p.salaryType === "range" && (positive(p.salaryMin) || positive(p.salaryMax))) {
    postedAnchor = (p.salaryMax ?? p.salaryMin) as number;
    postedTop = positive(p.salaryMax) ? p.salaryMax : null;
  } else if (p.salaryType === "fixed" && positive(p.salaryFixed)) {
    postedAnchor = p.salaryFixed;
    postedTop = p.salaryFixed;
  }

  const fromCurrent = current ? current * (1 + raise) : null;
  const market = inputs.estimate && positive(inputs.estimate.low) && positive(inputs.estimate.high)
    ? (inputs.estimate.low + inputs.estimate.high) / 2
    : null;

  let target: number | null = null;
  let basis = "";
  if (postedAnchor) {
    target = postedAnchor;
    basis = p.salaryType === "range" ? "the upper quarter of the posted range" : "the posted salary";
  } else if (fromCurrent || market) {
    target = Math.max(fromCurrent ?? 0, market ?? 0);
    basis = fromCurrent && (!market || fromCurrent >= market)
      ? `your current salary plus ${Math.round(raise * 100)}%`
      : "the market estimate's midpoint";
  }

  if (minimum && (!target || target < minimum)) {
    target = minimum;
    basis = "your minimum";
  }

  if (!target) {
    return { annual: null, rangeHigh: null, basis: "", warnings: ["Enter your current or minimum salary, or add the posted salary, to get a figure."] };
  }

  if (minimum && postedTop && postedTop < minimum) {
    warnings.push(`The posted top end (${compactAmount(postedTop)}) is below your minimum (${compactAmount(minimum)}) — decide whether this role is worth negotiating up before applying.`);
  } else if (postedTop && target > postedTop) {
    warnings.push(`Your figure is above the posted range (${compactAmount(postedTop)} top end) — fine, but expect to negotiate.`);
  }

  const annual = roundFor(target, "year");
  return { annual, rangeHigh: roundFor(target * 1.08, "year"), basis, warnings };
}

function money(value: number, currency: string, period: SalaryPeriod, style: "compact" | "full"): string {
  const sym = SYMBOL[currency] ?? "";
  const rounded = roundFor(fromAnnual(value, period), period);
  return style === "compact" ? `${sym}${compactAmount(rounded)}` : `${sym}${rounded.toLocaleString("en-US")}`;
}

export function expectationAnswers(result: CalculatorResult, currency: string): ExpectationAnswer[] {
  const askBudget: ExpectationAnswer = {
    key: "ask-budget",
    label: "Ask their budget",
    mode: "ask-budget",
    period: "year",
    text: "Could you share the budget for this role and what the benefits package includes? I'm flexible for the right package.",
  };
  if (!result.annual) return [askBudget];

  const a = result.annual;
  const high = result.rangeHigh ?? a;
  return [
    { key: "year-compact", label: "Per year", mode: "amount", period: "year", text: `${money(a, currency, "year", "compact")} per year` },
    { key: "year-full", label: "Per year (gross)", mode: "amount", period: "year", text: `${money(a, currency, "year", "full")} gross per year` },
    { key: "month-full", label: "Per month", mode: "amount", period: "month", text: `${money(a, currency, "month", "full")} per month` },
    { key: "month-compact", label: "Per month (short)", mode: "amount", period: "month", text: `${money(a, currency, "month", "compact")} per month` },
    { key: "range", label: "Range", mode: "range", period: "year", text: `${money(a, currency, "year", "compact")}–${money(high, currency, "year", "compact")} per year` },
    {
      key: "negotiable",
      label: "Negotiable",
      mode: "negotiable",
      period: "year",
      text: `Negotiable depending on the overall package (benefits, bonus, remote work); my expectation is around ${money(a, currency, "year", "compact")} per year.`,
    },
    askBudget,
  ];
}

export function expectationText(e: {
  mode: ExpectationMode;
  currency: string;
  period: SalaryPeriod;
  amount?: number | null;
  min?: number | null;
  max?: number | null;
}): string {
  const sym = SYMBOL[e.currency] ?? "";
  const per = e.period === "month" ? "per month" : "per year";
  if (e.mode === "ask-budget") {
    return "Could you share the budget for this role and what the benefits package includes? I'm flexible for the right package.";
  }
  if (e.mode === "negotiable") {
    return positive(e.amount)
      ? `Negotiable depending on the overall package (benefits, bonus, remote work); my expectation is around ${sym}${compactAmount(e.amount)} ${per}.`
      : "Negotiable depending on the overall package (benefits, bonus, remote work).";
  }
  if (e.mode === "range" && positive(e.min) && positive(e.max)) {
    return `${sym}${compactAmount(e.min)}–${sym}${compactAmount(e.max)} ${per}`;
  }
  if (e.mode === "amount" && positive(e.amount)) return `${sym}${compactAmount(e.amount)} ${per}`;
  return "";
}

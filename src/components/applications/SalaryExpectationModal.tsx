"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Check, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/shared/Modal";
import { isPremiumUser, isSuperAdmin } from "@/lib/permissions";
import { compactAmount, editableAmount, isValidAmount, parseAmount } from "@/lib/salary";
import {
  DEFAULT_RAISE_PCT, calculateExpectation, expectationAnswers, fromAnnual, roundFor,
  type ExpectationAnswer, type PostedSalary, type SalaryPeriod,
} from "@/lib/salaryExpectation";
import type { SalaryExpectation } from "@/types/application";

export type CalculatorApply = {
  answer: ExpectationAnswer;
  amount: number | null;
  min: number | null;
  max: number | null;
  inputs: NonNullable<SalaryExpectation["inputs"]>;
  estimate: SalaryExpectation["estimate"];
};

const field =
  "surface w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";

const SYMBOL: Record<string, string> = { EUR: "€", USD: "$", BDT: "৳" };

export default function SalaryExpectationModal({
  onClose,
  onApply,
  currency,
  posted,
  postedLabel,
  role,
  initial,
}: {
  onClose: () => void;
  onApply: (value: CalculatorApply) => void;
  currency: string;
  posted: PostedSalary;
  postedLabel: string;
  role: { jobTitle: string; companyName: string; location: string; jobDescription: string };
  initial?: SalaryExpectation | null;
}) {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; plan?: string } | undefined;
  const premium = isSuperAdmin(user?.role) || isPremiumUser(user?.role, user?.plan);

  const [period, setPeriod] = useState<SalaryPeriod>(initial?.inputs?.period ?? "year");
  const [current, setCurrent] = useState(editableAmount(initial?.inputs?.current));
  const [minimum, setMinimum] = useState(editableAmount(initial?.inputs?.minimum));
  const [raisePct, setRaisePct] = useState(initial?.inputs?.raisePct ?? DEFAULT_RAISE_PCT);
  const [estimate, setEstimate] = useState(initial?.estimate ?? null);
  const [estimating, setEstimating] = useState(false);
  const [copied, setCopied] = useState("");

  const result = useMemo(
    () =>
      calculateExpectation({
        current: parseAmount(current),
        minimum: parseAmount(minimum),
        raisePct,
        inputPeriod: period,
        posted,
        estimate,
      }),
    [current, minimum, raisePct, period, posted, estimate],
  );
  const answers = expectationAnswers(result, currency);
  const sym = SYMBOL[currency] ?? "";

  const getEstimate = async () => {
    setEstimating(true);
    try {
      const res = await fetch("/api/applications/salary-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...role, currency }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Could not get a market estimate."); return; }
      setEstimate({ low: body.low, high: body.high, note: body.note, at: body.at });
    } finally {
      setEstimating(false);
    }
  };

  const copy = async (a: ExpectationAnswer) => {
    try {
      await navigator.clipboard.writeText(a.text);
      setCopied(a.key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      toast.error("Could not copy — select the text instead.");
    }
  };

  const apply = (a: ExpectationAnswer) => {
    const annual = result.annual;
    const inPeriod = (v: number | null) => (v ? roundFor(fromAnnual(v, a.period), a.period) : null);
    onApply({
      answer: a,
      amount: a.mode === "amount" || a.mode === "negotiable" ? inPeriod(annual) : null,
      min: a.mode === "range" ? inPeriod(annual) : null,
      max: a.mode === "range" ? inPeriod(result.rangeHigh) : null,
      inputs: { current: parseAmount(current), minimum: parseAmount(minimum), raisePct, period },
      estimate,
    });
  };

  return (
    <Modal open onClose={onClose} title="Salary expectation calculator">
      <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium">
            Current salary
            <input
              className={`${field} mt-1 ${isValidAmount(current) ? "" : "border-red-500"}`}
              placeholder={period === "year" ? "e.g. 45K" : "e.g. 3,8K"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium">
            Minimum you&apos;d accept
            <input
              className={`${field} mt-1 ${isValidAmount(minimum) ? "" : "border-red-500"}`}
              placeholder={period === "year" ? "e.g. 50K" : "e.g. 4,2K"}
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex overflow-hidden rounded-md border">
            {(["year", "month"] as const).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 transition ${i ? "border-l" : ""} ${period === p ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--surface-2)]"}`}
              >
                {p === "year" ? "Per year" : "Per month"}
              </button>
            ))}
          </div>
          <label className="flex flex-1 items-center gap-2">
            <span className="whitespace-nowrap font-medium">Raise on current: {raisePct}%</span>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={raisePct}
              onChange={(e) => setRaisePct(Number(e.target.value))}
              className="flex-1 accent-[var(--primary)]"
            />
          </label>
        </div>

        <div className="surface-muted space-y-1.5 rounded-md border p-3 text-xs">
          <p>
            <span className="text-muted">Posted for this job: </span>
            <span className="font-medium">{postedLabel || "not given"}</span>
          </p>
          {estimate ? (
            <p>
              <span className="text-muted">Market estimate (AI): </span>
              <span className="font-medium">{sym}{compactAmount(estimate.low)}–{sym}{compactAmount(estimate.high)} per year</span>
              {estimate.note && <span className="text-muted"> · {estimate.note}</span>}
              <span className="text-muted block mt-0.5">An estimate, not market data — check Glassdoor, Stepstone or levels.fyi.</span>
            </p>
          ) : premium ? (
            <button
              type="button"
              onClick={getEstimate}
              disabled={estimating || !role.jobTitle}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              {estimating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Get market estimate
            </button>
          ) : (
            <p className="text-muted">Premium adds an AI market estimate for this role and location.</p>
          )}
        </div>

        {result.annual ? (
          <div className="rounded-md border p-3">
            <p className="text-muted text-xs">Suggested</p>
            <p className="text-lg font-semibold">
              {sym}{compactAmount(result.annual)} per year
              <span className="text-muted text-sm font-normal"> · {sym}{roundFor(fromAnnual(result.annual, "month"), "month").toLocaleString("en-US")} per month</span>
            </p>
            <p className="text-muted text-xs">Based on {result.basis}.</p>
          </div>
        ) : null}

        {result.warnings.map((w) => (
          <p key={w} className="flex items-start gap-1.5 text-xs text-amber-600">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
          </p>
        ))}

        <ul className="space-y-2">
          {answers.map((a) => (
            <li key={a.key} className="flex items-start gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-muted text-[11px] font-medium uppercase tracking-wide">{a.label}</p>
                <p className="text-sm">{a.text}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(a)}
                aria-label={`Copy ${a.label}`}
                className="rounded-md border p-1.5 transition hover:bg-[var(--surface-2)]"
              >
                {copied === a.key ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={() => apply(a)}
                className="btn-primary whitespace-nowrap rounded-md px-2.5 py-1 text-xs"
              >
                Use this
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

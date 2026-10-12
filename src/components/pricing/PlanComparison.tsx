import { Check, Minus } from "lucide-react";
import {
  CV_FORMATS_FREE, CV_FORMATS_PREMIUM, canExportPdf, canUseAppDocs, cvVersionLimit,
  type CVFormatKey,
} from "@/lib/permissions";

export const FREE_AI_USES_PER_MONTH = 10;
export const PREMIUM_AI_USES_PER_MONTH = 200;

export const PREMIUM_PRICE = process.env.NEXT_PUBLIC_PREMIUM_PRICE?.trim() || "";

export function premiumPriceLabel(): string {
  return PREMIUM_PRICE || "Contact us";
}

const FORMAT_LABELS: Record<CVFormatKey, string> = {
  "ats:full": "ATS (full)",
  "ats:compact": "ATS (compact)",
  "europass:full": "Europass",
  "designer:full": "Designer",
  "lebenslauf:full": "Lebenslauf",
};

const formats = (keys: CVFormatKey[]) => keys.map((k) => FORMAT_LABELS[k] ?? k).join(", ");

type Cell = { ok: boolean; text: string };

export type PlanRow = { feature: string; hint?: string; free: Cell; premium: Cell };

export function planRows(): PlanRow[] {
  const freeVersions = cvVersionLimit("free", "free");
  const premiumVersions = cvVersionLimit("free", "premium");
  return [
    {
      feature: "Application tracking",
      hint: "Pipeline stages, ghost and duplicate detection, reminders and to-dos.",
      free: { ok: true, text: "Unlimited" },
      premium: { ok: true, text: "Unlimited" },
    },
    {
      feature: "CV formats",
      hint: "Real .docx files built from your structured CV.",
      free: { ok: true, text: formats(CV_FORMATS_FREE) },
      premium: { ok: true, text: formats(CV_FORMATS_PREMIUM) },
    },
    {
      feature: "PDF export",
      free: { ok: canExportPdf("free", "free"), text: canExportPdf("free", "free") ? "Included" : ".docx only" },
      premium: { ok: canExportPdf("free", "premium"), text: canExportPdf("free", "premium") ? ".docx and .pdf" : ".docx only" },
    },
    {
      feature: "Per-application documents",
      hint: "Generate a CV and cover letter tailored to one job from its Docs menu.",
      free: { ok: canUseAppDocs("free", "free"), text: canUseAppDocs("free", "free") ? "Included" : "Not included" },
      premium: { ok: canUseAppDocs("free", "premium"), text: canUseAppDocs("free", "premium") ? "Included" : "Not included" },
    },
    {
      feature: "Stored CV versions",
      free: { ok: true, text: `${freeVersions} version${freeVersions === 1 ? "" : "s"}` },
      premium: { ok: true, text: `${premiumVersions} versions` },
    },
    {
      feature: "AI tailoring",
      hint: "Shared-key uses per month. Bring your own AI key for unlimited use on any plan.",
      free: { ok: true, text: `${FREE_AI_USES_PER_MONTH} uses / month` },
      premium: { ok: true, text: `${PREMIUM_AI_USES_PER_MONTH} uses / month` },
    },
  ];
}

function CellView({ cell }: { cell: Cell }) {
  return (
    <span className="flex items-start gap-1.5 text-sm">
      {cell.ok ? (
        <Check size={15} className="text-success mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <Minus size={15} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <span>{cell.text}</span>
    </span>
  );
}

export default function PlanComparison({ compact = false, currentPlan }: { compact?: boolean; currentPlan?: "free" | "premium" }) {
  const rows = planRows();
  const price = premiumPriceLabel();

  return (
    <div className="surface overflow-hidden rounded-xl border">
      <table className="w-full text-left">
        <caption className="sr-only">What the Free and Premium plans include</caption>
        <thead className="surface-muted">
          <tr>
            <th scope="col" className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-xs font-semibold uppercase tracking-wide text-muted`}>
              Feature
            </th>
            <th scope="col" className={`${compact ? "px-3 py-2" : "px-4 py-3"} align-top`}>
              <span className="role-badge plan-free">Free</span>
              {currentPlan === "free" && <span className="text-muted ml-2 text-[11px]">Your plan</span>}
              {!compact && <span className="text-muted mt-1 block text-xs font-normal">Free forever</span>}
            </th>
            <th scope="col" className={`${compact ? "px-3 py-2" : "px-4 py-3"} align-top`}>
              <span className="role-badge plan-premium">Premium</span>
              {currentPlan === "premium" && <span className="text-muted ml-2 text-[11px]">Your plan</span>}
              {!compact && <span className="text-muted mt-1 block text-xs font-normal">{price}</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-t align-top">
              <th scope="row" className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-sm font-medium`}>
                {row.feature}
                {!compact && row.hint && <span className="text-muted mt-0.5 block text-xs font-normal">{row.hint}</span>}
              </th>
              <td className={compact ? "px-3 py-2" : "px-4 py-3"}><CellView cell={row.free} /></td>
              <td className={compact ? "px-3 py-2" : "px-4 py-3"}><CellView cell={row.premium} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted border-t px-4 py-2 text-xs">
        Or bring your own AI key — unlimited AI tailoring on any plan.
      </p>
    </div>
  );
}

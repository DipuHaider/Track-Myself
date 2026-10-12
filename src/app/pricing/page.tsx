import Link from "next/link";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import PlanComparison, { premiumPriceLabel } from "@/components/pricing/PlanComparison";
import UpgradeCta from "@/components/pricing/UpgradeCta";

export default function PricingPage() {
  const price = premiumPriceLabel();

  return (
    <div className="space-y-10">
      <header className="text-center">
        <p className="text-primary text-xs font-semibold uppercase tracking-wide">Pricing</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Free to track. Premium to stand out.</h1>
        <p className="text-muted mx-auto mt-3 max-w-2xl text-sm sm:text-base">
          Every account tracks unlimited applications, catches ghost listings and duplicates, and builds a real .docx CV.
          Premium unlocks every format, PDF export and documents tailored to each job.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <UpgradeCta />
          <p className="text-muted text-xs">
            Premium: <span className="font-medium">{price}</span>
            {price !== "Contact us" && " · cancel any time"}
          </p>
        </div>
      </header>

      <PlanComparison />

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface rounded-xl border p-4">
          <span className="icon-chip plan-premium mb-3"><Sparkles size={16} aria-hidden="true" /></span>
          <h2 className="text-sm font-semibold">Documents per job</h2>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Generate a CV and cover letter written for one posting straight from the application&apos;s Docs menu.
          </p>
        </div>
        <div className="surface rounded-xl border p-4">
          <span className="icon-chip plan-premium mb-3"><KeyRound size={16} aria-hidden="true" /></span>
          <h2 className="text-sm font-semibold">Your own AI key</h2>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Add an Anthropic, Gemini or OpenAI-compatible key under AI key and the monthly allowance no longer applies — on any plan.
          </p>
        </div>
        <div className="surface rounded-xl border p-4">
          <span className="icon-chip plan-premium mb-3"><ShieldCheck size={16} aria-hidden="true" /></span>
          <h2 className="text-sm font-semibold">Your data stays yours</h2>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Export everything as JSON or delete the account from Settings whenever you like.
          </p>
        </div>
      </section>

      <section className="surface-muted rounded-xl border p-5 text-sm">
        <h2 className="font-semibold">How upgrading works</h2>
        <p className="text-muted mt-1">
          Press Upgrade and you are taken to checkout. While self-service checkout is not available, the same button sends an
          upgrade request instead: we confirm by email, arrange payment and switch your account to Premium.
          Questions first? See the{" "}
          <Link href="/faq" className="text-primary font-medium hover:underline">FAQ</Link>.
        </p>
      </section>
    </div>
  );
}

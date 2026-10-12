"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Crown, Loader2, Receipt } from "lucide-react";
import Loading from "@/components/shared/Spinner";
import PlanComparison, { premiumPriceLabel } from "@/components/pricing/PlanComparison";
import UpgradeCta from "@/components/pricing/UpgradeCta";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useProfile } from "@/hooks/useProfile";
import { ISSUE_STATUS_LABELS, type IssueStatus } from "@/constants/issues";
import { ROLE_LABELS, isPremiumRole, isPremiumUser, type Role } from "@/lib/permissions";

type Report = { _id: string; category: string; status: IssueStatus; note?: string; createdAt: string };

const STATUS_CLASS: Record<IssueStatus, string> = {
  open: "status-submitted",
  triaged: "status-interview",
  closed: "status-offer",
};

export default function PlanTab() {
  const { profile, loading } = useProfile();
  const { data: reports, mutate: refreshReports } = useSWR<Report[]>(profile ? "/api/issues" : null);
  const [portalBusy, setPortalBusy] = useState(false);

  if (loading || !profile) return <Loading padded={false} className="py-10" />;

  const premium = isPremiumUser(profile.role, profile.plan);
  const byRole = isPremiumRole(profile.role);
  const latestRequest = (reports ?? []).find((r) => r.category === "Upgrade request") ?? null;

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/billing/portal", { method: "POST" });
      window.location.assign(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not open billing.");
      setPortalBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <Crown size={16} className="text-primary" aria-hidden="true" />
              Your plan
            </h2>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`role-badge ${premium ? "plan-premium" : "plan-free"}`}>{premium ? "Premium" : "Free"}</span>
              <span className="text-muted">
                {byRole
                  ? `Included with the ${ROLE_LABELS[profile.role as Role] ?? profile.role} role.`
                  : premium
                    ? "Every CV format, PDF export and per-application documents are unlocked."
                    : `Premium is ${premiumPriceLabel()}.`}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {premium && !byRole && (
              <button
                type="button"
                onClick={openPortal}
                disabled={portalBusy}
                className="btn-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
              >
                {portalBusy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Receipt size={14} aria-hidden="true" />}
                Manage billing
              </button>
            )}
            {!premium && <UpgradeCta size="sm" onRequested={() => refreshReports()} />}
          </div>
        </div>

        {latestRequest && (
          <div className="surface-muted mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
            <span>
              Latest upgrade request · {new Date(latestRequest.createdAt).toLocaleDateString()}
              {latestRequest.note && <span className="text-muted"> — {latestRequest.note}</span>}
            </span>
            <span className={`role-badge ${STATUS_CLASS[latestRequest.status] ?? ""}`}>
              {ISSUE_STATUS_LABELS[latestRequest.status] ?? latestRequest.status}
            </span>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">What each plan includes</h2>
        <PlanComparison compact currentPlan={premium ? "premium" : "free"} />
      </section>
    </div>
  );
}

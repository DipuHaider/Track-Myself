"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Crown, Loader2, Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { isPremiumUser } from "@/lib/permissions";
import RequestUpgradeModal from "@/components/pricing/RequestUpgradeModal";
import type { IssueReportRow } from "@/components/shared/ReportIssueModal";

export default function UpgradeCta({
  size = "lg", onRequested, className = "",
}: {
  size?: "lg" | "sm";
  onRequested?: (report: IssueReportRow) => void;
  className?: string;
}) {
  const { data: session, status } = useSession();
  const user = session?.user as { role?: string; plan?: string; email?: string | null } | undefined;
  const premium = isPremiumUser(user?.role, user?.plan);
  const [busy, setBusy] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const pad = size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";

  if (status === "loading") {
    return <div className={`h-11 w-48 animate-pulse rounded-lg surface-muted ${className}`} aria-hidden="true" />;
  }

  if (status !== "authenticated") {
    return (
      <Link href="/register?next=/pricing" className={`btn-primary inline-flex items-center gap-2 rounded-lg font-semibold ${pad} ${className}`}>
        <Sparkles size={16} aria-hidden="true" />
        Create a free account
      </Link>
    );
  }

  if (premium) {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        <span className="role-badge plan-premium inline-flex items-center gap-1">
          <Crown size={12} aria-hidden="true" />
          You&apos;re on Premium
        </span>
        <Link href="/me/settings?tab=plan" className={`btn-secondary rounded-lg ${pad}`}>
          Manage
        </Link>
      </div>
    );
  }

  const checkout = async () => {
    setBusy(true);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/billing/checkout", { method: "POST", json: { plan: "premium" } });
      window.location.assign(url);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 501 || err.code === "billing-unavailable")) {
        setRequestOpen(true);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not start the upgrade. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={checkout}
        disabled={busy}
        className={`btn-primary inline-flex items-center gap-2 rounded-lg font-semibold ${pad} ${className}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Crown size={16} aria-hidden="true" />}
        Upgrade to Premium
      </button>
      <RequestUpgradeModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        email={user?.email}
        onSent={onRequested}
      />
    </>
  );
}

"use client";

import Link from "next/link";
import { isPremiumUser } from "@/lib/permissions";

export default function PlanBadge({ role, plan }: { role?: string | null; plan?: string | null }) {
  const premium = isPremiumUser(role, plan);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`role-badge ${premium ? "plan-premium" : "plan-free"}`}>{premium ? "Premium" : "Free"}</span>
      {premium ? (
        <Link href="/me/settings?tab=plan" className="text-primary text-xs hover:underline">Manage</Link>
      ) : (
        <Link href="/pricing" className="text-primary text-xs font-medium hover:underline">Upgrade</Link>
      )}
    </span>
  );
}

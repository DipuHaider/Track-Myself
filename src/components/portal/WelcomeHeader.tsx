"use client";

import { useSession } from "next-auth/react";
import RoleAvatar, { RoleIcon } from "@/components/shared/RoleAvatar";
import PlanBadge from "@/components/portal/PlanBadge";
import { useApplicationStats } from "@/hooks/useApplicationStats";
import { TIER_LABELS, roleTier } from "@/lib/permissions";

export type WelcomeUser = { id: string; role: string; plan: string; status: string; email?: string | null };

export default function WelcomeHeader({ user }: { user: WelcomeUser }) {
  const { data: session } = useSession();
  const { stats } = useApplicationStats();
  const name = session?.user?.name || user.email?.split("@")[0] || "there";
  const tier = roleTier(user.role, user.plan);
  const total = stats?.total ?? 0;

  return (
    <header className="flex items-center gap-4">
      <RoleAvatar name={name} image={session?.user?.image ?? ""} role={user.role} plan={user.plan} size={56} />
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">Welcome back, {name}!</h1>
        <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
          <span className={`role-badge role-${user.role} inline-flex items-center gap-1`}>
            <RoleIcon role={user.role} plan={user.plan} size={11} />
            {TIER_LABELS[tier]}
          </span>
          <PlanBadge role={user.role} plan={user.plan} />
          {total > 0 && <span>· {total} application{total !== 1 ? "s" : ""} tracked</span>}
        </p>
      </div>
    </header>
  );
}

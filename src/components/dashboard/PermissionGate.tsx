"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { ACTION_LABELS, type DashboardAction } from "@/lib/permissions";

export default function PermissionGate({
  action, children,
}: {
  action: DashboardAction;
  children: React.ReactNode;
}) {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="text-muted animate-spin" />
      </div>
    );
  }

  if (!can(action)) {
    return (
      <div className="surface flex items-start gap-3 rounded-xl border p-5">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
        <div>
          <p className="font-medium">You don&apos;t have access to this page</p>
          <p className="text-muted mt-0.5 text-sm">
            Your role is not permitted to &ldquo;{ACTION_LABELS[action]}&rdquo;. Ask an admin to grant it
            from Dashboard → Access Control.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

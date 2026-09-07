"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { canDo, isPremiumUser, type DashboardAction } from "@/lib/permissions";

type PermissionState = {
  role: string;
  plan: string;
  isPremium: boolean;
  actions: DashboardAction[];
};

let cache: PermissionState | null = null;
let inflight: Promise<PermissionState | null> | null = null;

export function invalidatePermissions() {
  cache = null;
  inflight = null;
}

function load(): Promise<PermissionState | null> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = fetch("/api/user/permissions")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: PermissionState | null) => {
      cache = data;
      return data;
    })
    .catch(() => null)
    .finally(() => { inflight = null; });

  return inflight;
}

export function usePermissions() {
  const { data: session } = useSession();
  const sessionUser = session?.user as { role?: string; plan?: string } | undefined;
  const role = sessionUser?.role ?? "";
  const plan = sessionUser?.plan ?? "free";

  const [state, setState] = useState<PermissionState | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => { if (alive) setState(d); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function can(action: DashboardAction) {
    if (state) return state.actions.includes(action);
    return canDo(role, action);
  }

  return {
    role: state?.role ?? role,
    plan: state?.plan ?? plan,
    isPremium: state?.isPremium ?? isPremiumUser(role, plan),
    can,
    loading,
    ready: Boolean(state),
  };
}

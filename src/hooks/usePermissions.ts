"use client";

import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import { canDo, isPremiumUser, type DashboardAction } from "@/lib/permissions";

type PermissionState = {
  role: string;
  plan: string;
  isPremium: boolean;
  actions: DashboardAction[];
};

export const PERMISSIONS_KEY = "/api/user/permissions";

export function invalidatePermissions() {
  return mutate(PERMISSIONS_KEY);
}

export function usePermissions() {
  const { data: session, status } = useSession();
  const sessionUser = session?.user as { role?: string; plan?: string } | undefined;
  const role = sessionUser?.role ?? "";
  const plan = sessionUser?.plan ?? "free";

  const { data, isLoading } = useSWR<PermissionState>(status === "authenticated" ? PERMISSIONS_KEY : null, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  function can(action: DashboardAction) {
    if (data) return data.actions.includes(action);
    return canDo(role, action);
  }

  return {
    role: data?.role ?? role,
    plan: data?.plan ?? plan,
    isPremium: data?.isPremium ?? isPremiumUser(role, plan),
    can,
    loading: isLoading,
    ready: Boolean(data),
  };
}

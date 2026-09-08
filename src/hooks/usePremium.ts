"use client";

import { useSession } from "next-auth/react";
import { isPremiumUser } from "@/lib/permissions";

export function usePremium() {
  const { data: session, status } = useSession();
  const user = session?.user as { role?: string; plan?: string } | undefined;

  return {
    signedIn: Boolean(session),
    loading: status === "loading",
    isPremium: isPremiumUser(user?.role, user?.plan),
  };
}

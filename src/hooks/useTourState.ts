"use client";

import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import type { TourAudience, TourScope } from "@/lib/tour";

export type TourState = {
  enabled: Record<TourScope, boolean>;
  seen: TourScope[];
  audience: TourAudience;
  premium: boolean;
};

export const TOUR_STATE_KEY = "/api/user/tour";

export function refreshTourState() {
  return mutate(TOUR_STATE_KEY);
}

export function useTourState() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const { data, isLoading } = useSWR<TourState>(signedIn ? TOUR_STATE_KEY : null, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
  return { state: data ?? null, loading: signedIn && isLoading, signedIn };
}

"use client";

import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import type { AiKeyState } from "@/lib/ai/shared";

export const AI_KEY_STATE_KEY = "/api/user/ai-key";

export function refreshAiKeyState() {
  return mutate(AI_KEY_STATE_KEY);
}

export function useAiKeyState() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const { data, isLoading, mutate: revalidate } = useSWR<AiKeyState>(signedIn ? AI_KEY_STATE_KEY : null, {
    refreshInterval: 60_000,
    dedupingInterval: 15_000,
  });
  return { state: data ?? null, loading: signedIn && isLoading, signedIn, refresh: revalidate };
}

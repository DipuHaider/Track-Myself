"use client";

import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";

export type ProfileView = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: "active" | "paused";
  pausedAt: string | null;
  bio: string;
  image: string;
  hasPassword: boolean;
  googleLinked: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  a11y: Record<string, unknown>;
  toursSeen: string[];
  notifPrefs: Record<string, boolean>;
  createdAt: string | null;
};

export const PROFILE_KEY = "/api/user/profile";

export function refreshProfile() {
  return mutate(PROFILE_KEY);
}

export function useProfile() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const swr = useSWR<ProfileView>(signedIn ? PROFILE_KEY : null, { revalidateOnFocus: false });
  return { profile: swr.data ?? null, loading: signedIn && swr.isLoading, error: swr.error, mutate: swr.mutate };
}

export type AccountView = { status: "active" | "paused"; pausedAt: string | null; hasPassword: boolean };

export const ACCOUNT_KEY = "/api/user/account";

export function useAccount() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const swr = useSWR<AccountView>(signedIn ? ACCOUNT_KEY : null, { revalidateOnFocus: false });
  return { account: swr.data ?? null, loading: signedIn && swr.isLoading, error: swr.error, mutate: swr.mutate };
}

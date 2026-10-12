"use client";

import useSWR, { mutate } from "swr";
import type { ApiError } from "@/lib/api/client";
import type { Application } from "@/types/application";

export const STATS_KEY = "/api/applications/stats";

export type RecentApplication = Pick<
  Application,
  "_id" | "companyName" | "jobTitle" | "applicationStatus" | "appliedDate" | "createdAt" | "favourite" | "priority" | "city" | "country"
>;

export type ApplicationStats = {
  total: number;
  byStatus: Record<string, number>;
  favourites: number;
  ghostManual: number;
  ghostAuto: number;
  warmLeads: number;
  duplicates: number;
  duplicateIds: string[];
  trashCount: number;
  recent: RecentApplication[];
};

export function refreshApplicationStats() {
  return mutate(STATS_KEY);
}

export function useApplicationStats() {
  const swr = useSWR<ApplicationStats, ApiError>(STATS_KEY);
  const status = swr.error?.status;
  return {
    stats: swr.data ?? null,
    loading: swr.isLoading,
    error: swr.error,
    paused: status === 403 || status === 423,
    mutate: swr.mutate,
  };
}

"use client";

import useSWR, { mutate } from "swr";

export type AdminAnalytics = {
  totals: {
    applications: number;
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    ghosts: number;
    users: number;
    activeUsers: number;
  };
  funnel: { stage: string; count: number }[];
  statusCounts: Record<string, number>;
  trend: { month: string; label: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  topPlatforms: { name: string; count: number }[];
  usersByRole: Record<string, number>;
  recentUsers: {
    _id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    createdAt: string;
    lastLoginAt: string | null;
  }[];
  recent: {
    _id: string;
    companyName: string;
    jobTitle: string;
    applicationStatus: string;
    date: string;
  }[];
};

export const ADMIN_ANALYTICS_KEY = "/api/admin/analytics";

export function invalidateAdminAnalytics() {
  return mutate(ADMIN_ANALYTICS_KEY);
}

export function useAdminAnalytics() {
  const { data, error, isLoading } = useSWR<AdminAnalytics>(ADMIN_ANALYTICS_KEY, { dedupingInterval: 30_000 });
  return { data: data ?? null, loading: isLoading, failed: Boolean(error) };
}

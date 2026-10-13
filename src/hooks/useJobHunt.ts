"use client";

import useSWR, { mutate as globalMutate } from "swr";
import type { ApiError } from "@/lib/api/client";
import type { JobHuntView } from "@/lib/jobs/settings";
import type { LeadSummary, LeadView } from "@/lib/jobs/leads";

export type LeadPage = { items: LeadView[]; total: number; page: number; limit: number; hasMore: boolean };
export type LeadFile = { _id: string; name: string; mimeType: string; size: number; docType: string; output: string; uploadedAt: string | null };
export type JobSearchRow = {
  _id: string;
  name: string;
  keywords: string;
  location: string;
  radiusKm: number;
  remote: boolean;
  sources: string[];
  maxAgeDays: number;
  excludeCompanies: string[];
  extensionUrls: string[];
  active: boolean;
  lastRunAt: string | null;
  lastRunSummary: { received?: number; created?: number; tooOld?: number; errors?: string[] } | null;
};

export const JOB_HUNT_KEY = "/api/user/job-hunt";
export const LEAD_SUMMARY_KEY = "/api/user/leads/summary";
export const JOB_SEARCHES_KEY = "/api/user/job-searches";

export function useJobHuntSettings() {
  const swr = useSWR<{ allowed: boolean; settings: JobHuntView }, ApiError>(JOB_HUNT_KEY);
  return { data: swr.data, allowed: swr.data?.allowed ?? false, settings: swr.data?.settings, loading: swr.isLoading, error: swr.error, mutate: swr.mutate };
}

export function useLeadSummary(enabled = true) {
  const swr = useSWR<LeadSummary, ApiError>(enabled ? LEAD_SUMMARY_KEY : null, { refreshInterval: 120_000 });
  return { summary: swr.data, loading: swr.isLoading, error: swr.error, mutate: swr.mutate };
}

export function useLeads(query: string) {
  const swr = useSWR<LeadPage, ApiError>(`/api/user/leads?${query}`, { keepPreviousData: true });
  return { page: swr.data, loading: swr.isLoading, validating: swr.isValidating, error: swr.error, mutate: swr.mutate };
}

export function useLead(id: string | null) {
  const swr = useSWR<{ lead: LeadView; files: LeadFile[] }, ApiError>(id ? `/api/user/leads/${id}` : null);
  return { data: swr.data, loading: swr.isLoading, error: swr.error, mutate: swr.mutate };
}

export function useJobSearches() {
  const swr = useSWR<JobSearchRow[], ApiError>(JOB_SEARCHES_KEY);
  return { searches: swr.data, loading: swr.isLoading, error: swr.error, mutate: swr.mutate };
}

/* Any lead change moves counts on the summary and every list page. */
export function refreshLeads() {
  return globalMutate((key) => typeof key === "string" && key.startsWith("/api/user/leads"));
}

"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { apiFetch, type ApiError } from "@/lib/api/client";
import { toApiQuery, type ApplicationFilters } from "@/lib/applicationQuery";
import type { DuplicateKind } from "@/lib/applicationFlags";
import { STATS_KEY } from "@/hooks/useApplicationStats";
import type { Application } from "@/types/application";

export const PAGE_LIMIT = 20;

export type ApplicationRow = Application & { duplicateKind?: DuplicateKind | null };

export type ApplicationsEnvelope = {
  items: ApplicationRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

function replaceRow(current: ApplicationsEnvelope | undefined, app: Partial<Application> & { _id: string }) {
  if (!current) return current;
  return {
    ...current,
    items: current.items.map((row) => (row._id === app._id ? { ...row, ...app } : row)),
  };
}

export function useApplicationsPage(filters: ApplicationFilters) {
  const key = toApiQuery(filters, PAGE_LIMIT);
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApplicationsEnvelope, ApiError>(key, {
    keepPreviousData: true,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const touchStats = useCallback(() => void globalMutate(STATS_KEY), []);

  const addApplication = useCallback(
    (app: Application) => {
      void mutate(
        (current) =>
          current
            ? { ...current, items: [app, ...current.items.filter((a) => a._id !== app._id)], total: current.total + 1 }
            : current,
        { revalidate: true },
      );
      touchStats();
    },
    [mutate, touchStats],
  );

  const updateApplication = useCallback(
    (app: Application) => {
      void mutate((current) => replaceRow(current, app), { revalidate: false });
      touchStats();
    },
    [mutate, touchStats],
  );

  const removeApplication = useCallback(
    (id: string) => {
      void mutate(
        (current) =>
          current
            ? { ...current, items: current.items.filter((a) => a._id !== id), total: Math.max(0, current.total - 1) }
            : current,
        { revalidate: true },
      );
      touchStats();
    },
    [mutate, touchStats],
  );

  const patchApplication = useCallback(
    async (id: string, patch: Partial<Application>) => {
      await mutate(
        async (current) => {
          const updated = await apiFetch<Application>(`/api/applications/${id}`, { method: "PUT", json: patch });
          return replaceRow(current, updated);
        },
        {
          optimisticData: (current) => replaceRow(current, { _id: id, ...patch }) as ApplicationsEnvelope,
          rollbackOnError: true,
          revalidate: false,
        },
      );
      touchStats();
    },
    [mutate, touchStats],
  );

  return {
    key,
    items,
    rawItems: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? filters.page,
    limit: data?.limit ?? PAGE_LIMIT,
    hasMore: data?.hasMore ?? false,
    loading: isLoading && !data,
    validating: isValidating,
    error,
    mutate,
    addApplication,
    updateApplication,
    removeApplication,
    patchApplication,
  };
}

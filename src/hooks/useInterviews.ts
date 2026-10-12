"use client";

import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { apiFetch, type ApiError } from "@/lib/api/client";
import { NOTIFICATIONS_KEY } from "@/hooks/useNotifications";
import { STATS_KEY } from "@/hooks/useApplicationStats";
import type { Interview, InterviewInput } from "@/types/interview";

export function interviewsKey(applicationId: string) {
  return `/api/applications/${applicationId}/interviews`;
}

function sortRounds(rows: Interview[]): Interview[] {
  return [...rows].sort((a, b) => {
    const at = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.POSITIVE_INFINITY;
    const bt = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function useInterviews(applicationId: string | null) {
  const key = applicationId ? interviewsKey(applicationId) : null;
  const { data, error, isLoading, mutate } = useSWR<Interview[], ApiError>(key, { revalidateOnFocus: false });

  const touch = useCallback(() => {
    void globalMutate(NOTIFICATIONS_KEY);
    void globalMutate(STATS_KEY);
  }, []);

  const add = useCallback(
    async (input: InterviewInput) => {
      if (!key || !applicationId) return;
      const temp: Interview = {
        _id: `temp-${Date.now()}`,
        applicationId,
        ...input,
        createdAt: new Date().toISOString(),
      };
      await mutate(
        async (current) => {
          const created = await apiFetch<Interview>(key, { method: "POST", json: input });
          return sortRounds([...(current ?? []).filter((r) => r._id !== temp._id), created]);
        },
        {
          optimisticData: (current) => sortRounds([...(current ?? []), temp]),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      touch();
    },
    [applicationId, key, mutate, touch],
  );

  const update = useCallback(
    async (id: string, patch: Partial<InterviewInput>) => {
      if (!key) return;
      await mutate(
        async (current) => {
          const updated = await apiFetch<Interview>(`${key}/${id}`, { method: "PATCH", json: patch });
          return sortRounds((current ?? []).map((r) => (r._id === id ? updated : r)));
        },
        {
          optimisticData: (current) => sortRounds((current ?? []).map((r) => (r._id === id ? { ...r, ...patch } : r))),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      touch();
    },
    [key, mutate, touch],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!key) return;
      await mutate(
        async (current) => {
          await apiFetch(`${key}/${id}`, { method: "DELETE" });
          return (current ?? []).filter((r) => r._id !== id);
        },
        {
          optimisticData: (current) => (current ?? []).filter((r) => r._id !== id),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      touch();
    },
    [key, mutate, touch],
  );

  return {
    interviews: data ?? [],
    loading: Boolean(key) && isLoading,
    error,
    add,
    update,
    remove,
    mutate,
  };
}

"use client";

import useSWR, { type SWRConfiguration } from "swr";
import type { ApiError } from "@/lib/api/client";

export function useApi<T>(key: string | null, config?: SWRConfiguration<T, ApiError>) {
  const swr = useSWR<T, ApiError>(key, config);
  return {
    data: swr.data,
    error: swr.error,
    loading: swr.isLoading,
    validating: swr.isValidating,
    mutate: swr.mutate,
  };
}

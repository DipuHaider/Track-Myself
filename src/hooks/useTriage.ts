"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { apiFetch, type ApiError } from "@/lib/api/client";
import type { TriageResultView } from "@/lib/triageLabels";

export const TRIAGE_KEY = "/api/user/triage";

async function runTriage(url: string) {
  return apiFetch<TriageResultView>(url, { method: "POST" });
}

export function useTriage() {
  const preview = useSWR<TriageResultView, ApiError>(TRIAGE_KEY, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const run = useSWRMutation<TriageResultView, ApiError, string>(TRIAGE_KEY, runTriage, {
    populateCache: false,
    revalidate: false,
  });

  return {
    preview: preview.data ?? null,
    previewLoading: preview.isLoading,
    previewError: preview.error,
    result: run.data ?? null,
    running: run.isMutating,
    runError: run.error,
    run: () => run.trigger(),
    reset: run.reset,
  };
}

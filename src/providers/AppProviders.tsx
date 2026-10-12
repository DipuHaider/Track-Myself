"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api/client";
import { ConfirmProvider } from "@/components/shared/ConfirmDialog";

/* One cache for every client read. Keys are URL strings, the fetcher throws on
   non-2xx, and a 401 or 403 is final rather than retried. */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        errorRetryCount: 2,
        shouldRetryOnError: (err) => {
          const status = (err as { status?: number })?.status ?? 0;
          return status !== 401 && status !== 403 && status !== 404 && status !== 423;
        },
      }}
    >
      <ConfirmProvider>{children}</ConfirmProvider>
    </SWRConfig>
  );
}

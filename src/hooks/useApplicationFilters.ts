"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  hasAnyFilter,
  parseFilters,
  toSearchParams,
  type ApplicationFilters,
} from "@/lib/applicationQuery";

const KEEPS_PAGE: ReadonlySet<keyof ApplicationFilters> = new Set(["page", "open", "tab"]);

export function useApplicationFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const set = useCallback(
    (patch: Partial<ApplicationFilters>) => {
      const next: ApplicationFilters = { ...filters, ...patch };
      const narrows = (Object.keys(patch) as (keyof ApplicationFilters)[]).some((k) => !KEEPS_PAGE.has(k));
      if (narrows && patch.page === undefined) next.page = 1;
      const qs = toSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const clear = useCallback(() => {
    set({ ...DEFAULT_FILTERS, open: filters.open, tab: filters.tab });
  }, [filters.open, filters.tab, set]);

  return {
    filters,
    set,
    clear,
    activeCount: countActiveFilters(filters),
    isFiltered: hasAnyFilter(filters),
  };
}

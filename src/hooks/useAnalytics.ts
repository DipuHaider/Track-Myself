"use client";

import { useEffect, useState } from "react";
import type { AnalyticsSummary } from "@/types/analytics";

export function useAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSummary(data as AnalyticsSummary | null));
  }, []);

  return summary;
}

"use client";

import { useEffect, useState } from "react";
import type { Application } from "@/types/application";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setApplications(data as Application[]))
      .finally(() => setLoading(false));
  }, []);

  return { applications, loading };
}

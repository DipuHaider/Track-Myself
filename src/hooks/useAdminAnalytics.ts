"use client";

import { useEffect, useState } from "react";

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
  recent: {
    _id: string;
    companyName: string;
    jobTitle: string;
    applicationStatus: string;
    date: string;
  }[];
};

let cache: AdminAnalytics | null = null;
let inflight: Promise<AdminAnalytics | null> | null = null;

export function invalidateAdminAnalytics() {
  cache = null;
  inflight = null;
}

async function load(): Promise<AdminAnalytics | null> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = fetch("/api/admin/analytics")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: AdminAnalytics | null) => {
      cache = data;
      return data;
    })
    .catch(() => null)
    .finally(() => { inflight = null; });

  return inflight;
}

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalytics | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setFailed(!d);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { data, loading, failed };
}

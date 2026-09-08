"use client";

import { useEffect, useState } from "react";
import type { Application } from "@/types/application";

export type ApplicationOwner = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
};

export type AdminApplication = Application & { owner: ApplicationOwner | null };

export function useAllApplications() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/applications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AdminApplication[] | null) => {
        if (!alive) return;
        if (Array.isArray(data)) setApplications(data);
        else setFailed(true);
      })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function updateApplication(app: AdminApplication) {
    setApplications((prev) =>
      prev.map((a) => (a._id === app._id ? { ...app, owner: app.owner ?? a.owner } : a)),
    );
  }

  function patchApplication(id: string, patch: Partial<Application>) {
    setApplications((prev) => prev.map((a) => (a._id === id ? { ...a, ...patch } : a)));
  }

  function removeApplication(id: string) {
    setApplications((prev) => prev.filter((a) => a._id !== id));
  }

  return { applications, loading, failed, updateApplication, patchApplication, removeApplication };
}

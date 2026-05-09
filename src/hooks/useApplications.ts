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

  function addApplication(app: Application) {
    setApplications((prev) => [app, ...prev]);
  }

  function updateApplication(app: Application) {
    setApplications((prev) => prev.map((a) => (a._id === app._id ? app : a)));
  }

  function removeApplication(id: string) {
    setApplications((prev) => prev.filter((a) => a._id !== id));
  }

  return { applications, loading, addApplication, updateApplication, removeApplication };
}

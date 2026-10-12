"use client";

import useSWR, { mutate } from "swr";
import type { Application } from "@/types/application";

export type ApplicationOwner = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
};

export type AdminApplication = Application & { owner: ApplicationOwner | null };

export const ADMIN_APPLICATIONS_KEY = "/api/admin/applications";

export function invalidateAllApplications() {
  return mutate(ADMIN_APPLICATIONS_KEY);
}

export function useAllApplications() {
  const { data, error, isLoading } = useSWR<AdminApplication[]>(ADMIN_APPLICATIONS_KEY);

  const set = (updater: (prev: AdminApplication[]) => AdminApplication[]) =>
    mutate<AdminApplication[]>(ADMIN_APPLICATIONS_KEY, (prev) => updater(prev ?? []), { revalidate: false });

  function updateApplication(app: AdminApplication) {
    return set((prev) => prev.map((a) => (a._id === app._id ? { ...a, ...app, owner: app.owner ?? a.owner } : a)));
  }

  function patchApplication(id: string, patch: Partial<Application>) {
    return set((prev) => prev.map((a) => (a._id === id ? { ...a, ...patch } : a)));
  }

  function removeApplication(id: string) {
    return set((prev) => prev.filter((a) => a._id !== id));
  }

  function addApplication(app: AdminApplication) {
    return set((prev) => [app, ...prev.filter((a) => a._id !== app._id)]);
  }

  return {
    applications: Array.isArray(data) ? data : [],
    loading: isLoading,
    failed: Boolean(error) || (data !== undefined && !Array.isArray(data)),
    updateApplication,
    patchApplication,
    removeApplication,
    addApplication,
    refresh: invalidateAllApplications,
  };
}

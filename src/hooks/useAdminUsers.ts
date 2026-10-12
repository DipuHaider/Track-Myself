"use client";

import useSWR, { mutate } from "swr";

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  status: "active" | "paused";
  pausedAt: string | null;
  image: string;
  hasPassword: boolean;
  googleLinked: boolean;
  emailVerifiedAt: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  aiKey: { configured: boolean; provider: string | null; status: string };
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminUsersPage = { items: AdminUser[]; total: number; page: number; limit: number };

export type AdminUserSort = "name" | "email" | "createdAt" | "lastLoginAt";

export type AdminUsersParams = {
  page?: number;
  limit?: number;
  q?: string;
  role?: string;
  plan?: string;
  status?: string;
  sort?: AdminUserSort;
  dir?: "asc" | "desc";
};

export const ADMIN_USERS_KEY = "/api/admin/users";

export function adminUsersKey(params: AdminUsersParams = {}): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 25));
  if (params.q) sp.set("q", params.q);
  if (params.role) sp.set("role", params.role);
  if (params.plan) sp.set("plan", params.plan);
  if (params.status) sp.set("status", params.status);
  if (params.sort) sp.set("sort", params.sort);
  if (params.dir) sp.set("dir", params.dir);
  return `${ADMIN_USERS_KEY}?${sp.toString()}`;
}

export function invalidateAdminUsers() {
  return mutate((key) => typeof key === "string" && key.startsWith(ADMIN_USERS_KEY), undefined, { revalidate: true });
}

export function useAdminUsers(params: AdminUsersParams = {}) {
  const key = adminUsersKey(params);
  const { data, error, isLoading, isValidating } = useSWR<AdminUsersPage>(key, { keepPreviousData: true });

  function patchLocal(id: string, patch: Partial<AdminUser>) {
    return mutate<AdminUsersPage>(
      key,
      (current) => current && { ...current, items: current.items.map((u) => (u._id === id ? { ...u, ...patch } : u)) },
      { revalidate: false },
    );
  }

  function removeLocal(id: string) {
    return mutate<AdminUsersPage>(
      key,
      (current) => current && { ...current, total: Math.max(0, current.total - 1), items: current.items.filter((u) => u._id !== id) },
      { revalidate: false },
    );
  }

  return {
    key,
    users: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? params.page ?? 1,
    limit: data?.limit ?? params.limit ?? 25,
    loading: isLoading,
    validating: isValidating,
    error: error as Error | undefined,
    failed: Boolean(error),
    patchLocal,
    removeLocal,
    refresh: () => mutate(key),
  };
}

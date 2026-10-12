"use client";

import useSWR from "swr";

export type AuditEntry = {
  _id: string;
  at: string;
  actor: { id: string | null; email: string };
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string;
};

export type AuditPage = {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  actions: string[];
};

export type AuditParams = {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  targetId?: string;
  since?: string;
};

export const ADMIN_AUDIT_KEY = "/api/admin/audit";

export function auditKey(params: AuditParams = {}): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 50));
  if (params.action) sp.set("action", params.action);
  if (params.actorId) sp.set("actorId", params.actorId);
  if (params.targetId) sp.set("targetId", params.targetId);
  if (params.since) sp.set("since", params.since);
  return `${ADMIN_AUDIT_KEY}?${sp.toString()}`;
}

export function useAdminAudit(params: AuditParams = {}) {
  const key = auditKey(params);
  const { data, error, isLoading, isValidating, mutate } = useSWR<AuditPage>(key, { keepPreviousData: true });
  return {
    key,
    entries: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? params.page ?? 1,
    limit: data?.limit ?? params.limit ?? 50,
    actions: data?.actions ?? [],
    loading: isLoading,
    validating: isValidating,
    error: error as Error | undefined,
    failed: Boolean(error),
    refresh: () => mutate(),
  };
}

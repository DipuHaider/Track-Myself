"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownAZ, ArrowUpAZ, KeyRound, MailCheck, MailX, Search } from "lucide-react";
import { toast } from "sonner";
import { ACCOUNT_STATUSES, PLANS, PLAN_LABELS, ROLES, ROLE_LABELS, isPremiumRole, type Plan, type Role } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { invalidateAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { invalidateAdminUsers, useAdminUsers, type AdminUser, type AdminUserSort } from "@/hooks/useAdminUsers";
import { apiFetch } from "@/lib/api/client";
import RoleAvatar, { RoleIcon } from "@/components/shared/RoleAvatar";
import Loading, { InlineSpinner } from "@/components/shared/Spinner";
import Pagination from "@/components/shared/Pagination";
import PermissionGate from "@/components/dashboard/PermissionGate";
import RelativeTime from "@/components/dashboard/RelativeTime";
import { useConfirm } from "@/components/shared/ConfirmDialog";

const PAGE_LIMIT = 25;
const SORTS: { key: AdminUserSort; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "createdAt", label: "Joined" },
  { key: "lastLoginAt", label: "Last login" },
];

type DeleteResult = { success: boolean; retrying: boolean };

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  const paused = status === "paused";
  return (
    <span className={`role-badge ${paused ? "status-no-resp" : "status-offer"}`}>
      {paused ? "Paused" : "Active"}
    </span>
  );
}

function VerifiedMark({ user }: { user: AdminUser }) {
  if (user.emailVerified) {
    return (
      <span className="text-success inline-flex items-center gap-1 text-xs" title={user.emailVerifiedAt ? `Verified ${new Date(user.emailVerifiedAt).toLocaleString()}` : "Email verified"}>
        <MailCheck size={13} aria-hidden="true" /> Verified
      </span>
    );
  }
  return (
    <span className="text-warning inline-flex items-center gap-1 text-xs" title="Email not verified yet">
      <MailX size={13} aria-hidden="true" /> Unverified
    </span>
  );
}

function UsersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const ask = useConfirm();

  const canEdit = can("edit:users");
  const canDelete = can("delete:users");
  const canAssignSuper = can("assign:superadmin");
  const assignableRoles = canAssignSuper ? ROLES : ROLES.filter((r) => r !== "superadmin");

  const urlQ = searchParams.get("q") ?? "";
  const sort = (SORTS.some((s) => s.key === searchParams.get("sort")) ? searchParams.get("sort") : "createdAt") as AdminUserSort;
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const roleFilter = searchParams.get("role") ?? "";
  const planFilter = searchParams.get("plan") ?? "";
  const statusFilter = searchParams.get("status") ?? "";

  const [search, setSearch] = useState(urlQ);
  const debouncedSearch = useDebounced(search.trim(), 300);

  const setParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (debouncedSearch !== urlQ) setParams({ q: debouncedSearch, page: null });
  }, [debouncedSearch, urlQ, setParams]);

  const { users, total, limit, loading, validating, failed, error, patchLocal, removeLocal } = useAdminUsers({
    page, limit: PAGE_LIMIT, q: urlQ, sort, dir, role: roleFilter, plan: planFilter, status: statusFilter,
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [saving, setSaving] = useState<string | null>(null);

  function rowCanEdit(user: AdminUser) {
    return canEdit && (canAssignSuper || user.role !== "superadmin");
  }

  function toggleSort(key: AdminUserSort) {
    if (sort === key) setParams({ dir: dir === "asc" ? "desc" : "asc", page: null });
    else setParams({ sort: key, dir: key === "name" ? "asc" : "desc", page: null });
  }

  async function applyChange(
    user: AdminUser,
    patch: { role?: string; plan?: string; status?: string },
    confirm: { title: string; message: string; confirmLabel: string; danger?: boolean },
    done: string,
  ) {
    const ok = await ask({
      title: confirm.title,
      message: confirm.message,
      confirmLabel: confirm.confirmLabel,
      tone: confirm.danger ? "danger" : "default",
    });
    if (!ok) return;
    const tag = `${user._id}:${Object.keys(patch)[0]}`;
    setSaving(tag);
    try {
      const updated = await apiFetch<AdminUser>(`/api/admin/users/${user._id}`, { method: "PATCH", json: patch });
      await patchLocal(user._id, updated);
      toast.success(done);
      void invalidateAdminUsers();
      void invalidateAdminAnalytics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update that user.");
    } finally {
      setSaving(null);
    }
  }

  function changeRole(user: AdminUser, role: string) {
    if (role === user.role) return;
    const sensitive = user.role === "superadmin" || role === "superadmin";
    void applyChange(
      user,
      { role },
      {
        title: `Change ${user.name || user.email}'s role?`,
        message: `${ROLE_LABELS[user.role as Role] ?? user.role} → ${ROLE_LABELS[role as Role] ?? role}. Their dashboard access changes within five minutes.`,
        confirmLabel: "Change role",
        danger: sensitive,
      },
      `${user.name || user.email} is now ${ROLE_LABELS[role as Role] ?? role}`,
    );
  }

  function changePlan(user: AdminUser, plan: string) {
    if (plan === user.plan) return;
    void applyChange(
      user,
      { plan },
      {
        title: `${plan === "premium" ? "Upgrade" : "Downgrade"} ${user.name || user.email}?`,
        message: plan === "premium"
          ? "Unlocks PDF export and AI CV tailoring. Applies within five minutes."
          : "Removes PDF export and AI CV tailoring. Applies within five minutes.",
        confirmLabel: plan === "premium" ? "Set Premium" : "Set Free",
        danger: user.role === "superadmin",
      },
      `${user.name || user.email} moved to ${PLAN_LABELS[plan as Plan] ?? plan}`,
    );
  }

  function changeStatus(user: AdminUser) {
    const pausing = user.status !== "paused";
    void applyChange(
      user,
      { status: pausing ? "paused" : "active" },
      {
        title: pausing ? `Pause ${user.name || user.email}?` : `Resume ${user.name || user.email}?`,
        message: pausing
          ? "They are signed out and cannot sign in until the account is resumed. Their data is kept."
          : "They can sign in again straight away.",
        confirmLabel: pausing ? "Pause account" : "Resume account",
        danger: pausing || user.role === "superadmin",
      },
      pausing ? `${user.name || user.email} paused` : `${user.name || user.email} resumed`,
    );
  }

  async function deleteUser(user: AdminUser) {
    const ok = await ask({
      title: `Delete user "${user.name || user.email}"?`,
      message: "This erases their account and every application, interview, to-do, notification, issue report, CV profile and uploaded document. It cannot be undone.",
      confirmLabel: "Delete user",
      tone: "danger",
    });
    if (!ok) return;
    setSaving(`${user._id}:delete`);
    try {
      const result = await apiFetch<DeleteResult>(`/api/admin/users/${user._id}`, { method: "DELETE" });
      await removeLocal(user._id);
      if (result.retrying) toast.warning(`Data for "${user.name || user.email}" is still being removed; the account will disappear once that finishes.`);
      else toast.success(`User "${user.name || user.email}" deleted`);
      void invalidateAdminUsers();
      void invalidateAdminAnalytics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that user.");
    } finally {
      setSaving(null);
    }
  }

  const busy = (user: AdminUser, field: string) => saving === `${user._id}:${field}`;
  const hasFilters = Boolean(urlQ || roleFilter || planFilter || statusFilter);

  function renderRole(user: AdminUser) {
    if (!rowCanEdit(user)) {
      return (
        <span className={`role-badge role-${user.role} inline-flex items-center gap-1`}>
          <RoleIcon role={user.role} plan={user.plan} size={11} />
          {ROLE_LABELS[user.role as Role] ?? user.role}
        </span>
      );
    }
    return (
      <select
        value={user.role}
        disabled={busy(user, "role")}
        onChange={(e) => changeRole(user, e.target.value)}
        aria-label={`Role for ${user.name || user.email}`}
        className="surface rounded border px-2 py-1 text-xs disabled:opacity-50"
      >
        {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </select>
    );
  }

  function renderPlan(user: AdminUser) {
    if (isPremiumRole(user.role)) {
      return (
        <span className="role-badge plan-premium" title={`${ROLE_LABELS[user.role as Role] ?? user.role} accounts always have Premium access`}>
          Premium (role)
        </span>
      );
    }
    if (!rowCanEdit(user)) {
      return <span className={`role-badge plan-${user.plan}`}>{PLAN_LABELS[user.plan as Plan] ?? user.plan}</span>;
    }
    return (
      <select
        value={user.plan}
        disabled={busy(user, "plan")}
        onChange={(e) => changePlan(user, e.target.value)}
        aria-label={`Plan for ${user.name || user.email}`}
        className="surface rounded border px-2 py-1 text-xs disabled:opacity-50"
      >
        {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
      </select>
    );
  }

  function renderStatus(user: AdminUser) {
    if (!rowCanEdit(user)) return <StatusBadge status={user.status} />;
    return (
      <button
        type="button"
        disabled={busy(user, "status")}
        onClick={() => changeStatus(user)}
        title={user.status === "paused" ? "Resume this account" : "Pause this account"}
        className="disabled:opacity-50"
      >
        <StatusBadge status={user.status} />
      </button>
    );
  }

  function renderDelete(user: AdminUser) {
    if (!canDelete || !rowCanEdit(user)) return null;
    return (
      <button
        type="button"
        disabled={busy(user, "delete")}
        onClick={() => deleteUser(user)}
        className="text-danger rounded px-2 py-1 text-xs transition hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        {busy(user, "delete") ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Users</h2>
          {canEdit ? (
            <p className="text-muted mt-0.5 text-xs">
              Set a plan to Premium to unlock PDF download and AI CV tailoring. Superadmin and Paid
              accounts are always Premium; it applies within five minutes, no re-login needed.
            </p>
          ) : (
            <p className="text-muted mt-0.5 text-xs">Read-only view — your role can view but not modify users.</p>
          )}
        </div>
        <p className="text-muted text-sm">
          {loading ? <InlineSpinner /> : `${total} ${hasFilters ? "matching" : "total"}`}
          {validating && !loading && <InlineSpinner label="Refreshing" />}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full max-w-sm">
          <Search size={14} className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search users"
            className="surface w-full rounded-md border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </label>

        <select value={roleFilter} onChange={(e) => setParams({ role: e.target.value, page: null })} aria-label="Filter by role" className="surface rounded-md border px-2 py-2 text-sm">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={planFilter} onChange={(e) => setParams({ plan: e.target.value, page: null })} aria-label="Filter by plan" className="surface rounded-md border px-2 py-2 text-sm">
          <option value="">All plans</option>
          {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setParams({ status: e.target.value, page: null })} aria-label="Filter by status" className="surface rounded-md border px-2 py-2 text-sm">
          <option value="">Active and paused</option>
          {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s === "paused" ? "Paused" : "Active"}</option>)}
        </select>

        {hasFilters && (
          <button type="button" onClick={() => { setSearch(""); setParams({ q: null, role: null, plan: null, status: null, page: null }); }} className="text-muted text-sm hover:underline">
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Sort users">
          <span className="text-muted mr-1 text-xs">Sort</span>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSort(s.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition ${active ? "border-[var(--primary)] text-[var(--primary)]" : "surface-muted hover:bg-[var(--surface-2)]"}`}
              >
                {s.label}
                {active && (dir === "asc" ? <ArrowUpAZ size={12} aria-label="ascending" /> : <ArrowDownAZ size={12} aria-label="descending" />)}
              </button>
            );
          })}
        </div>
      </div>

      {failed && (
        <p role="alert" className="alert alert-danger">{error?.message ?? "Could not load users. Please refresh and try again."}</p>
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="glass hidden overflow-hidden rounded-lg md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="surface-muted">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Last login</th>
                    {(canEdit || canDelete) && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t transition hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <RoleAvatar name={user.name} image={user.image} role={user.role} plan={user.plan} size={28} showTierBadge={false} />
                          <span className="flex flex-col">
                            <span className="font-medium">{user.name || "—"}</span>
                            {user.aiKey.configured && (
                              <span className="text-muted inline-flex items-center gap-1 text-[11px]" title={`Own ${user.aiKey.provider} key · ${user.aiKey.status}`}>
                                <KeyRound size={10} aria-hidden="true" /> Own AI key
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted block">{user.email}</span>
                        <VerifiedMark user={user} />
                      </td>
                      <td className="px-4 py-3">{renderRole(user)}</td>
                      <td className="px-4 py-3">{renderPlan(user)}</td>
                      <td className="px-4 py-3">{renderStatus(user)}</td>
                      <td className="text-muted whitespace-nowrap px-4 py-3">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="text-muted whitespace-nowrap px-4 py-3"><RelativeTime value={user.lastLoginAt} /></td>
                      {(canEdit || canDelete) && <td className="px-4 py-3 text-right">{renderDelete(user)}</td>}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="text-muted px-4 py-8" colSpan={(canEdit || canDelete) ? 8 : 7}>
                        {hasFilters ? "No users match these filters." : "No users found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="space-y-3 md:hidden">
            {users.map((user) => (
              <li key={user._id} className="glass space-y-3 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <RoleAvatar name={user.name} image={user.image} role={user.role} plan={user.plan} size={36} showTierBadge={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.name || "—"}</p>
                    <p className="text-muted truncate text-xs">{user.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <VerifiedMark user={user} />
                      {user.aiKey.configured && (
                        <span className="text-muted inline-flex items-center gap-1 text-[11px]">
                          <KeyRound size={10} aria-hidden="true" /> Own AI key
                        </span>
                      )}
                    </div>
                  </div>
                  {renderStatus(user)}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-muted">Role</dt>
                    <dd className="mt-0.5">{renderRole(user)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Plan</dt>
                    <dd className="mt-0.5">{renderPlan(user)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Joined</dt>
                    <dd className="mt-0.5">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Last login</dt>
                    <dd className="mt-0.5"><RelativeTime value={user.lastLoginAt} /></dd>
                  </div>
                </dl>
                {canDelete && rowCanEdit(user) && (
                  <div className="flex justify-end border-t pt-2">
                    {renderDelete(user)}
                  </div>
                )}
              </li>
            ))}
            {users.length === 0 && (
              <li className="glass text-muted rounded-lg p-6 text-center text-sm">
                {hasFilters ? "No users match these filters." : "No users found."}
              </li>
            )}
          </ul>
        </>
      )}

      <Pagination
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        onChange={(p) => setParams({ page: p === 1 ? null : String(p) })}
        total={total}
        shown={users.length}
        noun="users"
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <PermissionGate action="view:users">
      <Suspense fallback={<Loading />}>
        <UsersContent />
      </Suspense>
    </PermissionGate>
  );
}

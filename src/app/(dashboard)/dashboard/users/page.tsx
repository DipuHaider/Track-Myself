"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ROLES, ROLE_LABELS, isPremiumRole, type Role } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import PermissionGate from "@/components/dashboard/PermissionGate";

type UserRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
};

function UsersContent() {
  const { data: session } = useSession();
  const myRole = (session?.user as { role?: string } | undefined)?.role ?? "";
  const { can } = usePermissions();

  const canEdit   = can("edit:users");
  const canDelete = can("delete:users");

  // Roles available in the dropdown (superadmin can assign all; admin cannot assign superadmin)
  const assignableRoles = can("assign:superadmin")
    ? ROLES
    : ROLES.filter((r) => r !== "superadmin");

  const [users, setUsers]   = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function updateRole(userId: string, newRole: string) {
    setSaving(userId); setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setSaving(null);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to update role."); return; }
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
  }

  async function updatePlan(userId: string, plan: string) {
    setSaving(userId + "-plan"); setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setSaving(null);
    if (!res.ok) { setError("Failed to update plan."); return; }
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, plan } : u)));
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setSaving(userId + "-del");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setSaving(null);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to delete user."); return; }
    setUsers((prev) => prev.filter((u) => u._id !== userId));
  }

  // Per-row: admins cannot edit superadmin users (only superadmin can)
  function rowCanEdit(user: UserRecord) {
    return canEdit && (can("assign:superadmin") || user.role !== "superadmin");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Users</h2>
          {canEdit ? (
            <p className="text-muted mt-0.5 text-xs">
              Set a plan to Premium to unlock PDF download and AI CV tailoring. Superadmin and Paid
              accounts are always Premium; it applies within five minutes, no re-login needed.
            </p>
          ) : (
            <p className="text-muted mt-0.5 text-xs">
              Read-only view — your role can view but not modify users.
            </p>
          )}
        </div>
        <p className="text-muted text-sm">{users.length} total</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <div className="surface overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="surface-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Joined</th>
                {(canEdit || canDelete) && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const editable = rowCanEdit(user);
                return (
                  <tr key={user._id} className="border-t transition hover:bg-[var(--surface-2)]">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="text-muted px-4 py-3">{user.email}</td>

                    {/* Role cell */}
                    <td className="px-4 py-3">
                      {editable ? (
                        <select
                          value={user.role}
                          disabled={saving === user._id}
                          onChange={(e) => updateRole(user._id, e.target.value)}
                          className="surface rounded border px-2 py-1 text-xs"
                        >
                          {assignableRoles.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`role-badge role-${user.role}`}>
                          {ROLE_LABELS[user.role as Role] ?? user.role}
                        </span>
                      )}
                    </td>

                    {/* Plan cell */}
                    <td className="px-4 py-3">
                      {isPremiumRole(user.role) ? (
                        <span
                          className="role-badge plan-premium"
                          title={`${ROLE_LABELS[user.role as Role] ?? user.role} accounts always have Premium access`}
                        >
                          Premium (role)
                        </span>
                      ) : editable ? (
                        <select
                          value={user.plan}
                          disabled={saving === user._id + "-plan"}
                          onChange={(e) => updatePlan(user._id, e.target.value)}
                          className="surface rounded border px-2 py-1 text-xs"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                        </select>
                      ) : (
                        <span className={`role-badge plan-${user.plan}`}>
                          {user.plan === "premium" ? "Premium" : "Free"}
                        </span>
                      )}
                    </td>

                    <td className="text-muted px-4 py-3">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {(canEdit || canDelete) && (
                      <td className="px-4 py-3">
                        {canDelete && editable && (
                          <button
                            type="button"
                            disabled={saving === user._id + "-del"}
                            onClick={() => deleteUser(user._id, user.name)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {saving === user._id + "-del" ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    className="text-muted px-4 py-8"
                    colSpan={(canEdit || canDelete) ? 6 : 5}
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <PermissionGate action="view:users">
      <UsersContent />
    </PermissionGate>
  );
}

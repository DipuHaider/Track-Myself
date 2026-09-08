"use client";

import { useEffect, useState } from "react";
import Loading from "@/components/shared/Spinner";
import Pagination, { usePagination } from "@/components/shared/Pagination";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/permissions";

type UserRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function updateRole(userId: string, role: string) {
    setSaving(userId);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setSaving(null);
    if (!res.ok) {
      setError("Failed to update role.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
  }

  async function updatePlan(userId: string, plan: string) {
    setSaving(userId + "-plan");
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    setSaving(null);
    if (!res.ok) {
      setError("Failed to update plan.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, plan } : u)));
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setSaving(userId + "-del");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setSaving(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete user.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u._id !== userId));
  }

  const { page, setPage, totalPages, pageItems, total } = usePagination(users);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-muted text-sm">{users.length} total</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <Loading />
      ) : (
        <div className="glass overflow-hidden rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="surface-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((user) => (
                <tr key={user._id} className="border-t">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="text-muted px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={saving === user._id}
                      onChange={(e) => updateRole(user._id, e.target.value)}
                      className="surface rounded border px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.plan}
                      disabled={saving === user._id + "-plan"}
                      onChange={(e) => updatePlan(user._id, e.target.value)}
                      className="surface rounded border px-2 py-1 text-xs"
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </td>
                  <td className="text-muted px-4 py-3">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={saving === user._id + "-del"}
                      onClick={() => deleteUser(user._id, user.name)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {saving === user._id + "-del" ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="text-muted px-4 py-8" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        total={total}
        shown={pageItems.length}
        noun="users"
      />
    </div>
  );
}

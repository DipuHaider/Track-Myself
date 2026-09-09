"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { RoleIcon } from "@/components/shared/RoleAvatar";
import Loading from "@/components/shared/Spinner";

type UserRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <article className="surface rounded-lg border p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="text-primary mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}

export default function UserStatsSection() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data) => Array.isArray(data) && setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  const byRole = (r: string) => users.filter((u) => u.role === r).length;
  const recentUsers = users.slice(0, 8);

  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Overview</h2>
        <Link
          href="/dashboard/users"
          className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
        >
          Manage Users →
        </Link>
      </div>

      {loading ? (
        <Loading label="Loading user stats" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPill label="Total Users" value={users.length} />
            <StatPill label="Staff" value={byRole("superadmin") + byRole("admin") + byRole("editor")} />
            <StatPill label="Paid Members" value={byRole("paid")} />
            <StatPill label="Free Members" value={byRole("free")} />
          </div>

          <div className="glass overflow-hidden rounded-lg">
            <div className="border-b px-5 py-3">
              <h3 className="font-semibold">Recent Signups</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="surface-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user._id} className="border-t">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="text-muted px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`role-badge role-${user.role} inline-flex items-center gap-1`}>
                        <RoleIcon role={user.role} plan={user.plan} size={11} />
                        {ROLE_LABELS[user.role as Role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`role-badge plan-${user.plan}`}>
                        {user.plan === "premium" ? "Premium" : "Free"}
                      </span>
                    </td>
                    <td className="text-muted px-4 py-3">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td className="text-muted px-4 py-8" colSpan={5}>
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

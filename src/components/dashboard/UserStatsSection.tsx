"use client";

import Link from "next/link";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { RoleIcon } from "@/components/shared/RoleAvatar";
import Loading from "@/components/shared/Spinner";
import RelativeTime from "@/components/dashboard/RelativeTime";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <article className="surface rounded-lg border p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="text-primary mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}

export default function UserStatsSection() {
  const { data, loading, failed } = useAdminAnalytics();
  const byRole = data?.usersByRole ?? {};
  const count = (r: string) => byRole[r] ?? 0;
  const recentUsers = data?.recentUsers ?? [];

  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Overview</h2>
        <Link href="/dashboard/users" className="btn-secondary rounded-md px-3 py-1.5 text-xs font-medium">
          Manage Users →
        </Link>
      </div>

      {loading ? (
        <Loading label="Loading user stats" />
      ) : failed ? (
        <p role="alert" className="alert alert-danger">Could not load user statistics.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPill label="Total Users" value={data?.totals.users ?? 0} />
            <StatPill label="Active (tracking)" value={data?.totals.activeUsers ?? 0} />
            <StatPill label="Staff" value={count("superadmin") + count("admin") + count("editor")} />
            <StatPill label="Members" value={count("paid") + count("free")} />
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
                    <th className="px-4 py-3">Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user._id} className="border-t">
                      <td className="px-4 py-3 font-medium">{user.name || "—"}</td>
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
                      <td className="text-muted whitespace-nowrap px-4 py-3">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="text-muted whitespace-nowrap px-4 py-3">
                        <RelativeTime value={user.lastLoginAt} />
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr>
                      <td className="text-muted px-4 py-8" colSpan={6}>No users yet.</td>
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

"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import Loading from "@/components/shared/Spinner";

type UserRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  createdAt: string;
};

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <article className="surface rounded-lg border p-4">
      <p className="text-muted text-sm">{title}</p>
      <p className="text-primary mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  const byRole = (role: string) => users.filter((u) => u.role === role).length;
  const recentUsers = users.slice(0, 8);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Overview</h2>

      {loading ? (
        <Loading />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" value={users.length} />
            <StatCard title="Admins" value={byRole("admin")} />
            <StatCard title="Premium Members" value={byRole("premium")} />
            <StatCard title="Editors" value={byRole("editor")} />
          </section>

          <section className="surface rounded-lg border">
            <div className="border-b px-5 py-3">
              <h3 className="font-semibold">Recent Signups</h3>
            </div>
            <table className="w-full text-left text-sm">
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
                      <span className={`role-badge role-${user.role}`}>
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
          </section>
        </>
      )}
    </div>
  );
}

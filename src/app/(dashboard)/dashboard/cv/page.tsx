"use client";

import { useEffect, useState } from "react";
import { FileText, ImageIcon, Loader2, Star, Users } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import PermissionGate from "@/components/dashboard/PermissionGate";
import { RoleIcon } from "@/components/shared/RoleAvatar";
import Pagination, { usePagination } from "@/components/shared/Pagination";

type CVRow = {
  _id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  hasProfile: boolean;
  contentSource: "structured" | "legacy" | "none";
  completeness: number;
  roles: number;
  fileCount: number;
  storageBytes: number;
  byCategory: Record<string, number>;
  hasMainCV: boolean;
  hasPhoto: boolean;
  updatedAt: string | null;
};

type CVOverview = {
  totals: {
    users: number;
    withProfile: number;
    withFiles: number;
    withMainCV: number;
    stillLegacy: number;
    files: number;
    storageBytes: number;
    byCategory: Record<string, number>;
  };
  rows: CVRow[];
};

function fmtBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatPill({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="surface rounded-lg border p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="text-primary mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-muted mt-0.5 text-xs">{hint}</p>}
    </article>
  );
}

function CompletenessBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: "var(--primary)" }}
        />
      </div>
      <span className="text-muted text-xs tabular-nums">{value}%</span>
    </div>
  );
}

function DashboardCVContent() {
  const [data, setData] = useState<CVOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [onlyWithCV, setOnlyWithCV] = useState(false);

  useEffect(() => {
    fetch("/api/admin/cv")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CVOverview | null) => {
        setData(d);
        setFailed(!d);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const rows = (data?.rows ?? []).filter((r) => !onlyWithCV || r.hasProfile || r.fileCount > 0);
  const totals = data?.totals;
  const { page, setPage, totalPages, pageItems, total } = usePagination(rows);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">CV Overview</h2>
        <p className="text-muted mt-1 text-sm">
          Who has built a CV, who uploaded documents, and how much storage they use.
        </p>
      </div>

      {failed && (
        <p className="surface rounded-lg border p-4 text-sm text-red-600">
          Could not load CV data. Please refresh and try again.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-muted animate-spin" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatPill
              label="Users with a CV profile"
              value={`${totals?.withProfile ?? 0}`}
              hint={
                totals?.stillLegacy
                  ? `of ${totals.users} users · ${totals.stillLegacy} on legacy text`
                  : `of ${totals?.users ?? 0} users`
              }
            />
            <StatPill
              label="Users with uploads"
              value={`${totals?.withFiles ?? 0}`}
              hint={`${totals?.withMainCV ?? 0} marked a Main CV`}
            />
            <StatPill
              label="Stored files"
              value={`${totals?.files ?? 0}`}
              hint={
                Object.entries(totals?.byCategory ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([cat, n]) => `${n} ${cat.replace("-", " ")}`)
                  .join(" · ") || undefined
              }
            />
            <StatPill label="Storage used" value={fmtBytes(totals?.storageBytes ?? 0)} />
          </section>

          <section className="glass overflow-hidden rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <Users size={16} aria-hidden="true" />
                Per-user breakdown
              </h3>
              <label className="text-muted flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={onlyWithCV}
                  onChange={(e) => setOnlyWithCV(e.target.checked)}
                />
                Only users with CV data
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="surface-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">CV content</th>
                    <th className="px-4 py-3 font-medium">Files</th>
                    <th className="px-4 py-3 font-medium">Main CV</th>
                    <th className="px-4 py-3 font-medium">Storage</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((r) => (
                    <tr key={r._id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-muted text-xs">{r.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`role-badge role-${r.role} inline-flex items-center gap-1`}>
                          <RoleIcon role={r.role} plan={r.plan} size={11} />
                          {ROLE_LABELS[r.role as Role] ?? r.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.hasProfile ? (
                          <div className="space-y-1">
                            <CompletenessBar value={r.completeness} />
                            <p className="text-muted text-[11px]">
                              {r.roles} role{r.roles === 1 ? "" : "s"}
                              {r.contentSource === "legacy" && " · legacy text"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">Not started</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <FileText size={13} className="text-muted" aria-hidden="true" />
                          <span className="tabular-nums">{r.fileCount}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          {r.hasMainCV
                            ? <span className="flex items-center gap-1 text-xs" style={{ color: "var(--primary)" }}>
                                <Star size={12} fill="currentColor" aria-hidden="true" /> Main CV
                              </span>
                            : <span className="text-muted text-xs">—</span>}
                          {r.hasPhoto && (
                            <span className="text-muted flex items-center gap-1 text-[11px]">
                              <ImageIcon size={11} aria-hidden="true" /> Photo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-muted whitespace-nowrap px-4 py-3 tabular-nums">
                        {fmtBytes(r.storageBytes)}
                      </td>
                      <td className="text-muted whitespace-nowrap px-4 py-3">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {pageItems.length === 0 && (
                    <tr>
                      <td className="text-muted px-4 py-8" colSpan={7}>
                        No users match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t px-5 py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                total={total}
                shown={pageItems.length}
                noun="users"
                compact
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function DashboardCVPage() {
  return (
    <PermissionGate action="view:cv">
      <DashboardCVContent />
    </PermissionGate>
  );
}

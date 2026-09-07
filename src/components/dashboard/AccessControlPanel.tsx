"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, RotateCcw, Save, ShieldCheck, Lock } from "lucide-react";
import { invalidatePermissions } from "@/hooks/usePermissions";
import type { DashboardAction, Role } from "@/lib/permissions";

type RBACPayload = {
  matrix: Record<DashboardAction, Role[]>;
  defaults: Record<DashboardAction, Role[]>;
  updatedBy: string;
  updatedAt: string | null;
  roles: Role[];
  roleLabels: Record<Role, string>;
  actions: DashboardAction[];
  actionLabels: Record<DashboardAction, string>;
  actionDescriptions: Record<DashboardAction, string>;
  lockedActions: DashboardAction[];
};

function sameMatrix(a: Record<string, string[]>, b: Record<string, string[]>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = [...(a[k] ?? [])].sort().join(",");
    const y = [...(b[k] ?? [])].sort().join(",");
    if (x !== y) return false;
  }
  return true;
}

export default function AccessControlPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [data, setData] = useState<RBACPayload | null>(null);
  const [draft, setDraft] = useState<Record<DashboardAction, Role[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  function apply(payload: RBACPayload | null) {
    if (!payload) {
      setError("Could not load access control settings.");
      return;
    }
    setData(payload);
    setDraft(payload.matrix);
    invalidatePermissions();
  }

  useEffect(() => {
    fetch("/api/admin/rbac")
      .then((r) => (r.ok ? r.json() : null))
      .then(apply)
      .catch(() => setError("Could not load access control settings."))
      .finally(() => setLoading(false));
  }, []);

  function toggle(action: DashboardAction, role: Role) {
    setDraft((prev) => {
      if (!prev) return prev;
      const current = prev[action] ?? [];
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [action]: next };
    });
    setSavedFlash(false);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix: draft }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body?.error ?? "Could not save changes.");
        return;
      }
      apply(await res.json());
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 3000);
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("Reset every permission back to the built-in defaults?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rbac", { method: "DELETE" });
      if (!res.ok) {
        setError("Could not reset permissions.");
        return;
      }
      apply(await res.json());
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="text-muted animate-spin" />
      </div>
    );
  }

  if (!data || !draft) {
    return <p className="surface rounded-lg border p-4 text-sm text-red-600">{error || "No data."}</p>;
  }

  const dirty = !sameMatrix(draft, data.matrix);
  const isDefault = sameMatrix(draft, data.defaults);

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="surface flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">
              {isDefault ? "Using the built-in defaults" : "Customised permissions"}
            </p>
            <p className="text-muted text-xs">
              {data.updatedAt
                ? `Last changed ${new Date(data.updatedAt).toLocaleString()}${data.updatedBy ? ` by ${data.updatedBy}` : ""}`
                : "No changes saved yet."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <RotateCcw size={13} aria-hidden="true" /> Reset to defaults
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="btn-primary flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {savedFlash
              ? <><Check size={13} aria-hidden="true" /> Saved</>
              : saving
                ? <><Loader2 size={13} className="animate-spin" aria-hidden="true" /> Saving…</>
                : <><Save size={13} aria-hidden="true" /> Save changes</>}
          </button>
        </div>
      </div>

      <div className="surface overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="surface-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Permission</th>
                {data.roles.map((role) => (
                  <th key={role} className="px-3 py-3 text-center font-medium">
                    <span className={`role-badge role-${role} text-[10px]`}>{data.roleLabels[role]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.actions.map((action) => {
                const locked = data.lockedActions.includes(action);
                return (
                  <tr key={action} className="border-t align-top">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 font-medium">
                        {data.actionLabels[action]}
                        {locked && <Lock size={11} className="text-muted" aria-hidden="true" />}
                      </p>
                      <p className="text-muted text-xs leading-relaxed">{data.actionDescriptions[action]}</p>
                    </td>

                    {data.roles.map((role) => {
                      const checked = (draft[action] ?? []).includes(role);
                      const immutable = locked || role === "superadmin";
                      return (
                        <td key={role} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={immutable}
                            aria-label={`${data.actionLabels[action]} — ${data.roleLabels[role]}`}
                            title={
                              role === "superadmin"
                                ? "Superadmin always has every permission"
                                : locked
                                  ? "This permission is superadmin-only and cannot be reassigned"
                                  : undefined
                            }
                            onChange={() => toggle(action, role)}
                            className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface rounded-xl border p-5 text-sm">
        <h3 className="mb-2 font-semibold">How this works</h3>
        <ul className="text-muted space-y-1.5 text-xs leading-relaxed">
          <li>• Superadmin always holds every permission and cannot be unchecked.</li>
          <li>• &ldquo;Assign the superadmin role&rdquo; is locked to superadmin and cannot be reassigned.</li>
          <li>• Changes apply to the API and the dashboard navigation within a minute.</li>
          <li>• Access Control itself is always restricted to superadmin and admin — it is not part of the matrix, so you cannot lock yourself out.</li>
          <li>
            • Assign roles and plans to individual people on the{" "}
            <Link href="/dashboard/users" className="underline" style={{ color: "var(--primary)" }}>
              Users
            </Link>{" "}
            page.
          </li>
          {!isSuperAdmin && <li>• Some superadmin-only rows are read-only for your role.</li>}
        </ul>
      </div>
    </div>
  );
}
